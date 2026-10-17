/**
 * 本地计量（plan 交付项 9）：逐店 token、成本、L0/L1/L2 分布、
 * 缓存命中率、首响时间、AI 采纳率。纯函数，事件数组进、汇总结构出。
 */
import { monthKey } from './quota.js';
import { callCost } from './cost-model.js';

/**
 * @param {object} p
 * @returns 一条标准化计量事件
 */
export function makeGenerateEvent({
  storeId = 'store-default',
  conversationId,
  level,
  model = '',
  intent = '',
  tokens = {},
  cacheHit = false,
  latencyMs = 0,
  firstResponseMs = null,
  complianceVerdict = 'pass',
  demo = false,
  ts = Date.now(),
}) {
  return {
    kind: 'generate',
    ts,
    month: monthKey(ts),
    storeId,
    conversationId,
    level,
    model,
    intent,
    tokens: {
      prompt: tokens.prompt || 0,
      completion: tokens.completion || 0,
      cached: tokens.cached || 0,
    },
    cacheHit,
    latencyMs,
    firstResponseMs,
    complianceVerdict,
    demo,
  };
}

export function makeAdoptEvent({
  storeId = 'store-default',
  conversationId,
  level,
  ts = Date.now(),
}) {
  return { kind: 'adopt', ts, month: monthKey(ts), storeId, conversationId, level };
}

function costOf(e, pricing) {
  if (e.level === 'L0') return 0;
  return callCost({
    prompt: e.tokens.prompt,
    completion: e.tokens.completion,
    cached: e.tokens.cached,
    level: e.level,
    pricing,
  });
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 看板汇总。month 省略则汇总全部；可传 storeId 过滤。
 */
export function summarize(events, { pricing, month = null, storeId = null } = {}) {
  const gens = (events || []).filter(
    (e) => e.kind === 'generate'
      && (!month || e.month === month)
      && (!storeId || e.storeId === storeId),
  );
  const adopts = (events || []).filter(
    (e) => e.kind === 'adopt'
      && (!month || e.month === month)
      && (!storeId || e.storeId === storeId),
  );

  const byStore = {};
  const levelCounts = { L0: 0, L1: 0, L2: 0 };
  let tokensPrompt = 0;
  let tokensCompletion = 0;
  let tokensCached = 0;
  let cacheHitCount = 0;
  let cost = 0;
  const firstResponse = [];

  for (const e of gens) {
    levelCounts[e.level] = (levelCounts[e.level] || 0) + 1;
    tokensPrompt += e.tokens.prompt;
    tokensCompletion += e.tokens.completion;
    tokensCached += e.tokens.cached;
    if (e.cacheHit) cacheHitCount += 1;
    const c = pricing ? costOf(e, pricing) : 0;
    cost += c;
    if (Number.isFinite(e.firstResponseMs)) firstResponse.push(e.firstResponseMs);

    const s = (byStore[e.storeId] ||= {
      storeId: e.storeId,
      count: 0,
      tokensPrompt: 0,
      tokensCompletion: 0,
      tokensCached: 0,
      cost: 0,
      levelCounts: { L0: 0, L1: 0, L2: 0 },
      blocked: 0,
    });
    s.count += 1;
    s.tokensPrompt += e.tokens.prompt;
    s.tokensCompletion += e.tokens.completion;
    s.tokensCached += e.tokens.cached;
    s.cost += c;
    s.levelCounts[e.level] = (s.levelCounts[e.level] || 0) + 1;
    if (e.complianceVerdict === 'block') s.blocked += 1;
  }

  // 采纳率：按会话去重，已采纳会话 / 已生成草稿会话（L0 也产生可发送答案，计入分母）
  const generatedConvs = new Set(gens.map((e) => e.conversationId).filter(Boolean));
  const adoptedConvs = new Set(
    adopts.filter((a) => generatedConvs.has(a.conversationId)).map((a) => a.conversationId),
  );
  const adoptionRate = generatedConvs.size ? adoptedConvs.size / generatedConvs.size : null;

  const total = gens.length;
  return {
    total,
    byStore: Object.values(byStore),
    levelCounts,
    levelShare: {
      L0: total ? levelCounts.L0 / total : 0,
      L1: total ? levelCounts.L1 / total : 0,
      L2: total ? levelCounts.L2 / total : 0,
    },
    tokens: { prompt: tokensPrompt, completion: tokensCompletion, cached: tokensCached },
    cacheHitRate: total ? cacheHitCount / total : 0,
    cost: Math.round(cost * 10000) / 10000,
    adoptionRate,
    firstResponseMsMedian: median(firstResponse),
    blockedCount: gens.filter((e) => e.complianceVerdict === 'block').length,
  };
}
