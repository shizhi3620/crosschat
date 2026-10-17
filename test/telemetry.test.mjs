/**
 * 匿名遥测隐私护栏单测（v1.0.0 隐私设计）。
 */
import { test, ok, eq } from './harness.mjs';
import {
  Telemetry,
  classifyPlatform,
  sanitizeParams,
  isConfigured,
  sendToGa,
  ALLOWED_EVENTS,
  ALLOWED_PARAM_VALUES,
} from '../src/core/telemetry.js';
import { TELEMETRY } from '../src/config/telemetry.config.js';

function memStore() {
  const m = new Map();
  return { m, async get(k, f) { return m.has(k) ? m.get(k) : (f ?? null); }, async set(k, v) { m.set(k, v); } };
}
const REAL_CFG = { endpoint: TELEMETRY.endpoint, measurementId: 'G-TEST1234', apiSecret: 'secret-x' };

function makeTelemetry({ cfg = REAL_CFG, store = memStore(), now = 0, sends = [] } = {}) {
  const t = new Telemetry({
    store,
    cfg,
    now: () => now,
    idFactory: () => '11111111-1111-4111-8111-111111111111',
    sender: async (p) => { sends.push(p); },
  });
  return { t, store, sends, setNow: (ms) => { now = ms; } };
}

test('遥测: platform 粗分类只到平台级，不保留主机名', () => {
  eq(classifyPlatform('seller-us.tiktok.com'), 'tiktok');
  eq(classifyPlatform('shopee.com.my'), 'shopee');
  eq(classifyPlatform('sellercentral.amazon.de'), 'amazon');
  eq(classifyPlatform('mail.google.com'), 'gmail');
  eq(classifyPlatform('crm.example-shop.io'), 'other');
  eq(classifyPlatform(''), 'other');
  eq(classifyPlatform(null), 'other');
});

test('遥测: 参数白名单——正文/URL/PII/Key 等任何未声明字段一律剥离', () => {
  const dirty = {
    level: 'L2', platform_class: 'tiktok', mode: 'byok',
    text: 'please refund me at emma@example.com', message: '买家原话',
    url: 'https://seller.tiktok.com/im/conv/123', hostname: 'seller.tiktok.com',
    apiKey: 'sk-xxx', email: 'a@b.c', title: '订单 A-to-Z',
  };
  const clean = sanitizeParams('draft_generated', dirty);
  eq(clean, { level: 'L2', platform_class: 'tiktok', mode: 'byok' });
  eq(sanitizeParams('install', { level: 'L1', anything: 1 }), {});
});

test('遥测: 非法枚举值被丢弃', () => {
  eq(sanitizeParams('draft_generated', { level: 'L9', platform_class: 'evil', mode: 'demo' }), { mode: 'demo' });
});

test('遥测: 白名单外事件名不存在可乘之机', () => {
  ok(!Object.prototype.hasOwnProperty.call(ALLOWED_EVENTS, 'purchase'));
  ok(ALLOWED_EVENTS.draft_adopted.has('level'));
  ok(ALLOWED_PARAM_VALUES.platform_class.size === 5);
});

test('遥测: 占位符配置（开发/未打包）不发送', async () => {
  const { t, sends } = makeTelemetry({ cfg: TELEMETRY });
  ok(isConfigured(REAL_CFG));
  ok(!isConfigured(TELEMETRY));
  eq(await t.track('install'), false);
  eq(sends.length, 0);
});

test('遥测: opt-out 后零请求（install/daily/draft 全部不发）', async () => {
  const { t, sends } = makeTelemetry();
  await t.enable(false);
  await t.ensureClientId();
  eq(await t.track('install'), false);
  eq(await t.trackDailyActive(), false);
  eq(await t.track('draft_generated', { level: 'L1', platform_class: 'shopee', mode: 'byok' }), false);
  eq(sends.length, 0);
});

test('遥测: 未知事件不发送，install 可发送且无参数', async () => {
  const { t, sends } = makeTelemetry();
  eq(await t.track('not_a_real_event'), false);
  eq(await t.track('install'), true);
  eq(sends.length, 1);
  eq(sends[0].name, 'install');
  eq(sends[0].params, {});
  ok(sends[0].clientId === '11111111-1111-4111-8111-111111111111');
});

test('遥测: sender 抛错时静默失败，不冒泡到业务链路', async () => {
  const store = memStore();
  const t = new Telemetry({
    store,
    cfg: REAL_CFG,
    now: () => 0,
    idFactory: () => 'cid',
    sender: async () => { throw new Error('network down'); },
  });
  eq(await t.track('install'), false);
  eq(await t.trackDailyActive(), false);
});

test('遥测: GA 非 2xx 抛错且请求 URL/Body 正确', async () => {
  let calledUrl = null;
  let calledInit = null;
  const fetchImpl = async (url, init) => {
    calledUrl = url;
    calledInit = init;
    return { ok: false, status: 500 };
  };
  try {
    await sendToGa({ cfg: REAL_CFG, clientId: 'cid', name: 'install', params: {}, fetchImpl });
    throw new Error('should have thrown');
  } catch (e) {
    ok(/GA 500/.test(e.message), '应抛 GA 500');
  }
  ok(calledUrl.startsWith(`${REAL_CFG.endpoint}?measurement_id=G-TEST1234&api_secret=secret-x`));
  eq(JSON.parse(calledInit.body), { client_id: 'cid', events: [{ name: 'install', params: {} }] });
  ok(!isConfigured({ ...REAL_CFG, measurementId: 'X-1' }));
  ok(!isConfigured({ ...REAL_CFG, apiSecret: '__SET_AT_PACKAGING__' }));
});

test('遥测: daily_active 每 UTC 日至多一条，跨天恢复', async () => {
  let now = Date.UTC(2026, 9, 16, 1, 0, 0);
  const sends = [];
  const t = new Telemetry({
    store: memStore(), cfg: REAL_CFG, now: () => now,
    idFactory: () => 'cid', sender: async (p) => { sends.push(p); },
  });
  eq(await t.trackDailyActive(), true);
  eq(await t.trackDailyActive(), false);
  now = Date.UTC(2026, 9, 16, 23, 59, 0);
  eq(await t.trackDailyActive(), false);
  now = Date.UTC(2026, 9, 17, 0, 1, 0);
  eq(await t.trackDailyActive(), true);
  eq(sends.length, 2);
  eq(sends.every((s) => s.name === 'daily_active' && Object.keys(s.params).length === 0), true);
});

test('遥测: clientId 只生成一次并持久化；opt-out 仍保留 id 但不发', async () => {
  const store = memStore();
  const t1 = new Telemetry({ store, cfg: REAL_CFG, now: () => 0, idFactory: () => 'persistent-cid', sender: async () => {} });
  eq(await t1.ensureClientId(), 'persistent-cid');
  eq(await t1.ensureClientId(), 'persistent-cid');
  const t2 = new Telemetry({ store, cfg: REAL_CFG, now: () => 0, idFactory: () => 'SHOULD-NOT-HAPPEN', sender: async () => {} });
  eq(await t2.ensureClientId(), 'persistent-cid');
  await t2.enable(false);
  const s = await t2.state();
  eq(s.enabled, false);
  eq(s.clientId, 'persistent-cid');
});
