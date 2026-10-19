/**
 * 端到端编排（无 DOM，可在 node 单测中完整跑）：
 * 抓取消息 → PII 脱敏 → 知识库检索 → L0/L1/L2 路由 → 翻译/草拟
 * → 合规扫描 → 产出草稿与计量事件。只辅助人：本模块绝不发送消息。
 */
import { redact } from './pii.js';
import { search, matchFaq, renderAnswer } from './knowledge.js';
import { classifyIntent, generateDemo, demoTranslate } from './demo-engine.js';
import { route, LEVEL } from './router.js';
import { scan } from './compliance.js';
import { buildMessages, STRUCTURED_OUTPUT_HINT } from './prompts.js';
import { estimateMessagesTokens } from './history.js';
import { makeGenerateEvent } from './metering.js';
import { monthKey } from './quota.js';

function resolveKb(config, storeId) {
  const kbs = config.knowledgeBases || {};
  return kbs[storeId] || kbs.default || [];
}

function platformOf(config, storeId) {
  const store = (config.stores || []).find((s) => s.id === storeId);
  return store?.platform || 'generic';
}

/**
 * @param {object} args
 * @param {{text:string, storeId?:string, conversationId?:string, receivedAt?:number, productCard?:object}} args.message
 * @param {'auto'|'translate'|'draft'} [args.task]
 * @param {object} args.config                 完整合并后的配置
 * @param {'normal'|'tighten'|'cap'} [args.quotaPhase]
 * @param {Array} [args.history]               同会话历史轮次
 * @param {string|null} [args.historySummary]
 * @param {object} [args.clients]              { ark: createArkClient() 结果 }
 * @param {number} [args.now]
 */
export async function runPipeline({
  message,
  task = 'auto',
  config,
  quotaPhase: quotaPhaseName = 'normal',
  history = [],
  historySummary = null,
  clients = {},
  now = Date.now(),
}) {
  const started = now;
  const storeId = message.storeId || 'store-default';
  const conversationId = message.conversationId || `conv-${started}`;
  const platform = platformOf(config, storeId);
  const kb = resolveKb(config, storeId);
  const cc = config.costControl;

  // 1) PII 脱敏（占位符入模，原文不出本机）
  const { text: safeText, entities } = redact(message.text);

  // 2) 本地意图 + 知识库检索（Top 2–3 条）
  const intent = classifyIntent(safeText);
  const topK = Math.min(cc.ragTopK, 3);
  const kbHits = search(kb, safeText, { intent, topK });
  const faqHit = task !== 'translate'
    ? matchFaq(kb, safeText, { intent, threshold: 3, minCoverage: 0.5 })
    : null;

  // 3) 分级路由（配额收紧 / 超额强制 L1）
  const decision = route({
    text: safeText,
    task,
    faqHit,
    quotaPhase: quotaPhaseName,
    forceL1: quotaPhaseName === 'cap' && cc.overQuotaForceL1,
  });

  const base = {
    conversationId,
    storeId,
    platform,
    intent,
    level: decision.level,
    reasons: decision.reasons,
    risk: decision.risk,
    references: [],
    entities,
    safeText,
    demo: config.mode !== 'byok',
    // 占位内容（演示引擎 L1/L2 输出 / API 失败空草稿）不可采纳外发（P1-5）；
    // L0 FAQ 是卖家自己的知识库模板，即使未配 Key 也不是占位内容。
    placeholder: false,
    ts: started,
  };

  let draft = '';
  let riskFlags = decision.risk.signals;
  let model = 'rules+kb';
  let tokens = { prompt: 0, completion: 0, cached: 0 };
  let cacheHit = false;
  let translated = null;
  let error = null;
  let placeholder = false;

  // 4) 生成
  if (decision.level === LEVEL.L0) {
    // L0：规则 + FAQ 模板，零 Token
    const entry = faqHit.entry;
    draft = renderAnswer(entry.answer, message.productCard || {});
    base.references.push(entry.id);
  } else if (config.mode === 'byok' && config.ark.apiKey && clients.ark) {
    try {
      const messages = buildMessages({
        buyerText: task === 'translate' ? `${safeText}\n\n${STRUCTURED_OUTPUT_HINT}` : `${safeText}\n\n${STRUCTURED_OUTPUT_HINT}`,
        task: task === 'translate' ? 'translate' : 'draft',
        kbEntries: kbHits.map((h) => h.entry),
        history,
        recentTurns: cc.historyRecentTurns,
        historySummary,
        productCard: message.productCard,
      });
      const resp = await clients.ark.chat({
        level: decision.level,
        messages,
        maxTokens: cc.maxOutputTokens,
      });
      model = resp.model;
      tokens = {
        prompt: resp.usage.prompt || estimateMessagesTokens(messages),
        completion: resp.usage.completion || 0,
        cached: resp.usage.cached || 0,
      };
      cacheHit = tokens.cached > 0;
      if (task === 'translate' && !resp.structured) {
        translated = resp.content.trim();
        draft = translated;
      } else if (resp.structured) {
        draft = resp.structured.draft || '';
        if (resp.structured.intent) base.intent = resp.structured.intent;
        riskFlags = resp.structured.riskFlags || riskFlags;
        base.references = resp.structured.references || [];
      } else {
        draft = resp.content.trim();
      }
    } catch (e) {
      error = e.message || String(e);
      placeholder = true;
    }
  } else if (config.mode === 'byok' && !clients.ark) {
    error = 'BYOK 模式未初始化 Ark 客户端';
    placeholder = true;
  } else {
    // 演示引擎（离线）：输出全部是占位内容，界面必须红底禁采纳（P1-5）
    placeholder = true;
    if (task === 'translate') {
      translated = demoTranslate(safeText);
      draft = translated;
    } else {
      const out = generateDemo({
        text: safeText,
        intent,
        kbEntries: kbHits,
        level: decision.level,
      });
      draft = out.draft;
      riskFlags = out.riskFlags;
      base.references = out.references;
      tokens = out.tokens;
      model = out.model;
    }
  }

  // 5) 合规扫描（发送前 L0 规则层；API 失败也扫已有草稿便于人工改）
  const compliance = scan(draft, { platform });

  const event = makeGenerateEvent({
    storeId,
    conversationId,
    level: decision.level,
    model,
    intent: base.intent,
    tokens: error ? { prompt: 0, completion: 0, cached: 0 } : tokens,
    cacheHit,
    latencyMs: Math.max(0, Date.now() - started),
    firstResponseMs: message.receivedAt ? Math.max(0, started - message.receivedAt) : null,
    complianceVerdict: compliance.verdict,
    demo: base.demo,
    ts: started,
  });

  return {
    ...base,
    placeholder,
    draft,
    translated,
    riskFlags,
    model,
    usage: { tokens, cacheHit, model },
    compliance,
    blocked: compliance.blocked,
    error,
    month: monthKey(started),
    event,
  };
}
