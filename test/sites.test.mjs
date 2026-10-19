/**
 * 用户自选站点 / 动态注入逻辑单测（v1.0.0 隐私设计 权限收敛）。
 */
import { test, ok, eq } from './harness.mjs';
import {
  SITE_PRESETS,
  CONTENT_SCRIPT_ID,
  CONTENT_BUNDLE_PATH,
  isValidPattern,
  normalizePattern,
  buildRegisteredScripts,
  reconcileContentScripts,
  getEnabledPatterns,
  addPatterns,
  removePattern,
  presetById,
} from '../src/core/sites.js';

function memStore(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { m, async get(k, f) { return m.has(k) ? m.get(k) : (f ?? null); }, async set(k, v) { m.set(k, v); } };
}

test('站点: 预置 patterns 全部为合法 match pattern', () => {
  ok(SITE_PRESETS.length >= 4);
  for (const preset of SITE_PRESETS) {
    for (const p of preset.patterns) ok(isValidPattern(p), `${preset.id}: ${p}`);
  }
  ok(presetById('gmail').patterns.includes('https://mail.google.com/*'));
  eq(presetById('nope'), null);
});

test('站点: 合法/非法 pattern 判定', () => {
  ok(isValidPattern('https://*.tiktok.com/*'));
  ok(isValidPattern('https://sellercentral.amazon.com/*'));
  ok(isValidPattern('http://localhost:3000/*'));
  ok(!isValidPattern('https://*.shopee.*/*')); // 不支持 TLD 通配
  ok(!isValidPattern('ftp://x.com/*'));
  ok(!isValidPattern('https://nohost/*'));
  ok(!isValidPattern('https://x.com/specific/path')); // path 必须 /*
  ok(!isValidPattern(123));
});

test('站点: normalizePattern 接受裸域名与带路径 URL，统一为 origin/*', () => {
  eq(normalizePattern('seller.tiktok.com'), 'https://seller.tiktok.com/*');
  eq(normalizePattern('https://shopee.com.my/chat/conv/123'), 'https://shopee.com.my/*');
  eq(normalizePattern('http://localhost:8080/x'), 'http://localhost:8080/*');
  eq(normalizePattern('javascript:alert(1)'), null);
  eq(normalizePattern(''), null);
});

test('站点: buildRegisteredScripts 去重/过滤，空集返回空', () => {
  const scripts = buildRegisteredScripts(['https://a.com/*', 'https://a.com/*', 'bad-pattern']);
  eq(scripts.length, 1);
  eq(scripts[0].id, CONTENT_SCRIPT_ID);
  eq(scripts[0].js, [CONTENT_BUNDLE_PATH]);
  eq(scripts[0].matches, ['https://a.com/*']);
  eq(scripts[0].runAt, 'document_idle');
  eq(scripts[0].allFrames, true); // iframe 聊天窗也要注入（P0-2 附带项）
  eq(buildRegisteredScripts([]), []);
});

test('站点: reconcile 有 patterns 调 register，空 patterns 调 unregister', async () => {
  const calls = [];
  const api = {
    async registerContentScripts(scripts) { calls.push(['register', scripts]); },
    async unregisterContentScripts(q) { calls.push(['unregister', q]); },
  };
  const matches = await reconcileContentScripts(['https://*.tiktok.com/*'], api);
  eq(matches, ['https://*.tiktok.com/*']);
  eq(calls.length, 1);
  eq(calls[0][0], 'register');
  await reconcileContentScripts([], api);
  eq(calls[1][0], 'unregister');
  eq(calls[1][1].ids, [CONTENT_SCRIPT_ID]);
});

test('站点: unregister 遇到"本来就没注册"错误按已对齐处理', async () => {
  const api = {
    async registerContentScripts() { throw new Error('should not register'); },
    async unregisterContentScripts() { throw new Error('The content script with id x does not find a matching script'); },
  };
  eq(await reconcileContentScripts([], api), []);
});

test('站点: 存储增删去重，非法值落库即过滤', async () => {
  const store = memStore();
  let all = await addPatterns(['https://*.tiktok.com/*', 'https://*.tiktok.com/*'], store);
  eq(all, ['https://*.tiktok.com/*']);
  all = await addPatterns(['https://mail.google.com/*', 'junk'], store);
  eq(all, ['https://*.tiktok.com/*', 'https://mail.google.com/*']);
  eq(await getEnabledPatterns(store), all);
  all = await removePattern('https://*.tiktok.com/*', store);
  eq(all, ['https://mail.google.com/*']);
});
