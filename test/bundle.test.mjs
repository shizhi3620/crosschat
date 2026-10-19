/**
 * 注入产物 content.bundle.js 的护栏（评审 P1-6：WAR 收敛）：
 *  - 必须已生成且为经典脚本（无 import/export 残留）；
 *  - 在最小沙箱里加载不报错，并挂出 window.__crosschat。
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { test, ok } from './harness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = path.join(root, 'src/content/content.bundle.js');
const code = readFileSync(bundlePath, 'utf8');

test('bundle: 已生成且无 import/export 残留（经典脚本，不依赖 WAR）', () => {
  ok(code.length > 5000);
  ok(!/^\s*import\s/m.test(code), '不应残留 import 语句');
  ok(!/^\s*export\s/m.test(code), '不应残留 export 语句');
  ok(!/chrome\.runtime\.getURL/.test(code), '不应再通过 WAR URL 动态加载模块');
  ok(code.includes('bootstrap()'));
  for (const marker of ['src/core/pii.js', 'src/content/adapters.js', 'src/content/content-main.js']) {
    ok(code.includes(marker), `应内联 ${marker}`);
  }
});

test('bundle: 最小沙箱加载成功，暴露 window.__crosschat，bootstrap 去重', () => {
  const win = {};
  // getElementById 返回 truthy → bootstrap 立即返回，不触碰真实 DOM
  const sandbox = {
    window: win,
    document: { getElementById: () => ({}), createElement: () => { throw new Error('should early-return'); } },
    chrome: { runtime: { sendMessage: () => Promise.reject(new Error('stub')) } },
    navigator: {},
    location: { protocol: 'https:', hostname: 'example.com' },
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  ok(win.__crosschat, 'window.__crosschat 应被挂出');
  ok(typeof win.__crosschat.setInput === 'function');
  ok(win.__crosschatBootstrapped === true);
  // 重复执行应被 bootstrapped 标记短路
  vm.runInContext(code, sandbox);
  ok(true, '重复加载不抛错');
});
