/**
 * 匿名使用遥测（v1.0.1：中转架构，评审 P1-6）。
 *
 * v1.0.0 直连 GA4 Measurement Protocol 的做法要求 apiSecret 随包分发，公开安装包
 * 无法保密，v1.0.1 已移除客户端 secret：endpoint 留空时遥测整体停发；将来恢复时
 * endpoint 必须是 board 自建匿名中转（服务端持有 GA secret），客户端只 POST
 * 白名单事件 JSON。代码层拒绝直连 google-analytics.com，防止配置回退。
 *
 * 隐私硬约束（与隐私政策口径一致，测试锁定）：
 *  - 事件白名单：install / daily_active / draft_generated / draft_adopted，
 *    业务事件只允许 level / platform_class / mode 三个参数；
 *  - 绝不发送消息正文、译文、知识库内容、PII、完整 URL、页面标题、Ark Key；
 *  - platform_class 只把 hostname 粗分类为 tiktok|shopee|amazon|gmail|other；
 *  - client_id 为安装时本机生成的随机 UUID，不与任何身份关联；
 *  - 用户可在 options 一键关闭，关闭后零请求；请求失败静默，不影响功能。
 */
import { TELEMETRY } from '../config/telemetry.config.js';
import { localStore } from './storage.js';
import { STORAGE_KEYS } from './defaults.js';

/** 事件 -> 该事件允许携带的参数集合（空 Set 表示纯计数事件） */
export const ALLOWED_EVENTS = {
  install: new Set(),
  daily_active: new Set(),
  draft_generated: new Set(['level', 'platform_class', 'mode']),
  draft_adopted: new Set(['level', 'platform_class', 'mode']),
};

export const ALLOWED_PARAM_VALUES = {
  level: new Set(['L0', 'L1', 'L2']),
  platform_class: new Set(['tiktok', 'shopee', 'amazon', 'gmail', 'other']),
  mode: new Set(['byok', 'demo', 'hosted']),
};

/** hostname（不含协议/路径）-> 粗分类；任何无法归类的域名一律 other */
export function classifyPlatform(host) {
  if (!host || typeof host !== 'string') return 'other';
  const h = host.toLowerCase();
  if (h.includes('tiktok')) return 'tiktok';
  if (h.includes('shopee') || h.includes('shp.ee')) return 'shopee';
  if (h.includes('amazon')) return 'amazon';
  if (h === 'mail.google.com' || h.endsWith('.googlemail.com')) return 'gmail';
  return 'other';
}

/** 白名单过滤：丢弃未声明参数与非法枚举值；返回新对象，绝不回写调用方 */
export function sanitizeParams(eventName, params) {
  const allowed = ALLOWED_EVENTS[eventName];
  const out = {};
  if (!allowed || !params) return out;
  for (const key of allowed) {
    const v = params[key];
    if (v != null && ALLOWED_PARAM_VALUES[key].has(v)) out[key] = v;
  }
  return out;
}

/**
 * 仅当存在一个非 GA 官方端点的 https 匿名中转、且 measurementId 形态正常时才算配置好。
 * 任何情况下都不允许客户端直连 GA（那会重新把 secret 暴露进安装包，P1-6）。
 */
export function isConfigured(cfg = TELEMETRY) {
  if (!cfg || !cfg.endpoint || typeof cfg.endpoint !== 'string') return false;
  let url;
  try {
    url = new URL(cfg.endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.hostname === 'www.google-analytics.com' || url.hostname === 'google-analytics.com') {
    return false;
  }
  return Boolean(cfg.measurementId && /^G-[\w-]+$/.test(cfg.measurementId) && cfg.measurementId !== 'G-XXXXXXXXXX');
}

function utcDay(nowMs) {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * 向 board 自建匿名中转投递单条事件。密钥只存在于中转服务端，客户端请求里没有、
 * 也永远不应该有任何 secret。非 2xx 抛错由上层静默吞掉。
 */
export async function sendToRelay({ cfg, clientId, name, params, fetchImpl }) {
  const res = await fetchImpl(cfg.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      measurement_id: cfg.measurementId,
      client_id: clientId,
      events: [{ name, params }],
    }),
  });
  if (!res.ok) throw new Error(`Relay ${res.status}`);
}

/**
 * 遥测客户端。所有方法永不抛错（业务链路不受统计失败影响）。
 * 依赖通过构造参数注入，便于 node 单测：store / sender / now / idFactory / fetchImpl。
 */
export class Telemetry {
  constructor({
    store = localStore,
    cfg = TELEMETRY,
    now = () => Date.now(),
    idFactory = () => crypto.randomUUID(),
    sender = null,
  } = {}) {
    this.store = store;
    this.cfg = cfg;
    this.now = now;
    this.idFactory = idFactory;
    this.sender = sender || ((p) => sendToRelay({ ...p, fetchImpl: globalThis.fetch }));
  }

  async state() {
    const s = (await this.store.get(STORAGE_KEYS.telemetry, null)) || {};
    return { clientId: s.clientId || null, lastDay: s.lastDay || null, enabled: s.enabled !== false };
  }

  async #save(patch) {
    const cur = (await this.store.get(STORAGE_KEYS.telemetry, null)) || {};
    await this.store.set(STORAGE_KEYS.telemetry, { ...cur, ...patch });
  }

  async enable(on) {
    await this.#save({ enabled: !!on });
  }

  async ensureClientId() {
    const s = await this.state();
    if (s.clientId) return s.clientId;
    const clientId = this.idFactory();
    await this.#save({ clientId });
    return clientId;
  }

  async track(name, params = {}) {
    try {
      if (!Object.prototype.hasOwnProperty.call(ALLOWED_EVENTS, name)) return false;
      if (!isConfigured(this.cfg)) return false;
      const s = await this.state();
      if (!s.enabled) return false;
      const clientId = s.clientId || (await this.ensureClientId());
      const clean = sanitizeParams(name, params);
      await this.sender({ cfg: this.cfg, clientId, name, params: clean });
      return true;
    } catch {
      // 遥测静默失败：不重试、不打扰用户、不影响业务
      return false;
    }
  }

  /** 每 client 每 UTC 自然日最多一条 daily_active；返回是否实际发送 */
  async trackDailyActive() {
    try {
      const day = utcDay(this.now());
      const s = await this.state();
      if (!s.enabled) return false;
      if (s.lastDay === day) return false;
      const sent = await this.track('daily_active');
      if (sent) await this.#save({ lastDay: day });
      return sent;
    } catch {
      return false;
    }
  }
}

/** Service worker / 扩展页面共用单例（node 环境不创建也不报错） */
export const telemetry = new Telemetry();
