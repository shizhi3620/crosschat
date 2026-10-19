/**
 * CrossChat MV3 background service worker（module）。
 * 职责：消息总线、Ark 调用（从 SW 发出以规避页面 CORS）、计量持久化、安装播种、
 * 用户自选站点动态注入（v1.0.0 权限收敛）、匿名遥测（v1.0.1 起默认停发，待中转）。
 */
import { getConfig, saveConfig, getMeterEvents, appendMeterEvent, localStore } from '../core/storage.js';
import { STORAGE_KEYS } from '../core/defaults.js';
import { runPipeline } from '../core/pipeline.js';
import { createArkClient, describeArkError } from '../core/ark-client.js';
import { makeAdoptEvent } from '../core/metering.js';
import { monthKey, monthlyTokens, monthlyL2Share, quotaPhase } from '../core/quota.js';
import { summarize } from '../core/metering.js';
import { projectPer1000 } from '../core/cost-model.js';
import { telemetry, classifyPlatform } from '../core/telemetry.js';
import {
  SITE_PRESETS,
  getEnabledPatterns,
  addPatterns,
  removePattern,
  reconcileContentScripts,
} from '../core/sites.js';

const DEFAULT_KB_URL = chrome.runtime.getURL('src/data/knowledge-base.json');
const ONBOARDING_URL = chrome.runtime.getURL('src/onboarding/onboarding.html');

/**
 * 按「已存储且用户已授权 origin」对齐动态内容脚本。
 * registerContentScripts 只接受已授权 origin，未授权的保留在存储里等下次授权。
 */
async function syncContentScripts() {
  if (!chrome.scripting?.registerContentScripts) return { stored: [], registered: [] };
  const stored = await getEnabledPatterns();
  const registered = [];
  for (const p of stored) {
    try {
      if (await chrome.permissions.contains({ origins: [p] })) registered.push(p);
    } catch {
      /* contains 异常按未授权处理 */
    }
  }
  await reconcileContentScripts(registered, chrome.scripting);
  return { stored, registered };
}

chrome.runtime.onStartup.addListener(() => {
  syncContentScripts().catch((e) => console.warn('[CrossChat] content script reconcile failed', e));
});

chrome.runtime.onInstalled.addListener(async (details) => {
  // 首次安装：用随包 JSON 播种知识库（不覆盖用户之后在 options 的修改）
  if (details.reason === 'install') {
    try {
      const res = await fetch(DEFAULT_KB_URL);
      const entries = await res.json();
      const config = await getConfig();
      if (!config.knowledgeBases || !config.knowledgeBases.default) {
        await saveConfig({ knowledgeBases: { default: entries } });
      }
    } catch (e) {
      console.warn('[CrossChat] KB seed failed, using built-in fallback', e);
    }
    // 匿名遥测：生成随机 client id 并发 install（静默失败，不阻塞首启）
    try {
      await telemetry.ensureClientId();
      void telemetry.track('install');
    } catch (e) {
      console.warn('[CrossChat] telemetry install event failed', e);
    }
    // 打开首启引导（仅首次安装；更新不弹）
    try {
      await chrome.tabs.create({ url: ONBOARDING_URL });
    } catch (e) {
      console.warn('[CrossChat] failed to open onboarding', e);
    }
  }
  // 安装/更新后都对齐一次动态脚本（浏览器更新后状态可能漂移）
  syncContentScripts().catch((e) => console.warn('[CrossChat] content script reconcile failed', e));
});

/**
 * 「不保存即测」用：只挑取 ark 命名空间下的已知字段合并，避免消息内容污染整个配置。
 */
function mergeDraftArk(stored, draft) {
  const ark = { ...stored.ark, models: { ...(stored.ark.models || {}) } };
  if (typeof draft.baseUrl === 'string' && draft.baseUrl.trim()) ark.baseUrl = draft.baseUrl.trim();
  if (typeof draft.apiKey === 'string' && draft.apiKey.trim()) ark.apiKey = draft.apiKey.trim();
  if (Number.isFinite(Number(draft.timeoutMs)) && draft.timeoutMs !== null && draft.timeoutMs !== '') {
    ark.timeoutMs = Math.min(120000, Math.max(2000, Number(draft.timeoutMs)));
  }
  if (draft.models && typeof draft.models === 'object') {
    for (const k of ['l1', 'l2']) {
      if (typeof draft.models[k] === 'string' && draft.models[k].trim()) ark.models[k] = draft.models[k].trim();
    }
  }
  return { ...stored, ark };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== 'object' || !String(msg.type || '').startsWith('crosschat:')) {
    return false;
  }
  handle(msg)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({ ok: false, error: err?.message || String(err) }));
  return true; // async response
});

async function handle(msg) {
  switch (msg.type) {
    case 'crosschat:ping':
      return { pong: true, version: chrome.runtime.getManifest().version };

    case 'crosschat:dailyActive':
      return { sent: await telemetry.trackDailyActive() };

    case 'crosschat:process': {
      const config = await getConfig();
      const events = await getMeterEvents();
      const month = monthKey(msg.now || Date.now());
      const storeId = msg.message?.storeId || 'store-default';
      const used = monthlyTokens(events, { storeId, month });
      const q = quotaPhase(
        used,
        config.costControl.monthlyQuotaTokens,
        config.routing.tightenAtUsageRatio,
      );
      // L2 成本护栏：当月该店 L2 会话占比已达硬顶（默认 20%）时，
      // 路由效果等同 token 配额 cap——非 L0 一律走 L1，直到占比被新的 L1 会话稀释。
      const l2Share = monthlyL2Share(events, {
        storeId,
        month,
        maxShare: config.routing.maxL2Share ?? 0.2,
      });
      const effectivePhase = l2Share.capped && q.phase !== 'cap' ? 'cap' : q.phase;
      const clients = {};
      if (config.mode === 'byok' && config.ark.apiKey) {
        clients.ark = createArkClient(config);
      }
      const result = await runPipeline({
        message: msg.message,
        task: msg.task || 'auto',
        config,
        quotaPhase: effectivePhase,
        history: msg.history || [],
        historySummary: msg.historySummary || null,
        clients,
      });
      result.quota = q;
      result.l2Share = { ...l2Share, cappedReason: l2Share.capped ? 'monthly_l2_share_cap' : null };
      if (!result.error) await appendMeterEvent(result.event);

      // 匿名遥测：只发事件白名单字段，host 仅做平台粗分类（不保留主机名/URL/正文）
      void telemetry.trackDailyActive();
      if (!result.error) {
        void telemetry.track('draft_generated', {
          level: result.level,
          platform_class: classifyPlatform(msg.host),
          mode: config.mode,
        });
      }
      return result;
    }

    case 'crosschat:adopt': {
      const event = makeAdoptEvent({
        storeId: msg.storeId || 'store-default',
        conversationId: msg.conversationId,
        level: msg.level,
      });
      await appendMeterEvent(event);
      const config = await getConfig();
      void telemetry.track('draft_adopted', {
        level: msg.level,
        platform_class: classifyPlatform(msg.host),
        mode: config.mode,
      });
      return { adopted: true };
    }

    case 'crosschat:dashboard': {
      const [config, events] = await Promise.all([getConfig(), getMeterEvents()]);
      const month = msg.month || monthKey();
      const summary = summarize(events, { pricing: config.pricing, month });
      const projection = {
        noCache: projectPer1000(config.pricing, { cacheHitRate: 0 }),
        cache60: projectPer1000(config.pricing, { cacheHitRate: config.costControl.assumedCacheHitRate }),
      };
      return { summary, projection, month, stores: config.stores, pricing: config.pricing };
    }

    case 'crosschat:testKey': {
      // 「不保存即测」（评审 P0-3）：options 把表单当前值作为 draft 发来，
      // 与已存储配置合并后仅用于本次探测，绝不回写；测试失败不会污染已存配置。
      const stored = await getConfig();
      const config = msg.draft && typeof msg.draft === 'object'
        ? mergeDraftArk(stored, msg.draft)
        : stored;
      if (!config.ark?.apiKey) {
        throw new Error('还没有填写 API Key：先把火山方舟的 Key 粘进输入框（不用先保存），再点测试。');
      }
      const client = createArkClient(config);
      try {
        const resp = await client.chat({
          level: 'L1',
          messages: [
            { role: 'system', content: 'Reply with JSON only.' },
            { role: 'user', content: 'Return {"ok":true}' },
          ],
          maxTokens: 16,
        });
        return { model: resp.model, usage: resp.usage };
      } catch (e) {
        throw new Error(describeArkError(e));
      }
    }

    case 'crosschat:resetMeter': {
      await localStore.set(STORAGE_KEYS.events, []);
      return { reset: true };
    }

    // ---- 用户自选站点（动态注入） ----
    case 'crosschat:sites:list': {
      const patterns = await getEnabledPatterns();
      return { patterns, presets: SITE_PRESETS.map(({ id, name, patterns }) => ({ id, name, patterns })) };
    }

    case 'crosschat:sites:add': {
      const incoming = Array.isArray(msg.patterns) ? msg.patterns : [];
      await addPatterns(incoming);
      return syncContentScripts();
    }

    case 'crosschat:sites:remove': {
      await removePattern(String(msg.pattern || ''));
      return syncContentScripts();
    }

    case 'crosschat:sites:reconcile': {
      return syncContentScripts();
    }

    default:
      throw new Error(`Unknown message type: ${msg.type}`);
  }
}
