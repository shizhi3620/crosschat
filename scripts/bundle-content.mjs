#!/usr/bin/env node
/**
 * 零依赖内容脚本打包器（评审 P1-6：收敛 web_accessible_resources）。
 *
 * 背景：chrome.scripting.registerContentScripts 注册的是经典脚本，
 * RegisteredContentScript 没有 type:"module"；v1.0.0 的做法是注册一个
 * loader，再通过 WAR 暴露的 chrome.runtime.getURL() 动态 import ESM——
 * 这迫使整个 src 树对所有 http(s) 站点可见（指纹面）。
 *
 * 本脚本把注入到宿主页的模块图（content-main.js 及其相对依赖）拼成一个
 * 经典 IIFE 文件 src/content/content.bundle.js：动态注册直接注入该文件，
 * 不再需要 WAR、不需要 loader、没有任何运行时网络加载。
 * demo.html 等扩展内部页仍直接以 ESM 引用 content-main.js，不受影响。
 *
 * 约束（刻意保持极简，不引入 bundler 依赖）：
 *  - 仅支持单行 `import ... from './x.js'` 相对路径导入，无动态 import、无裸模块；
 *  - 仅剥除 `export ` 前缀，不支持 export { ... } 重导出（遇到即报错）；
 *  - 合并后所有模块共享一个 IIFE 词法作用域，顶层标识符不得重名。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryRel = 'src/content/content-main.js';
const outRel = 'src/content/content.bundle.js';

const modules = new Map(); // rel path -> stripped source

const IMPORT_RE = /^[ \t]*import\s+(?:[^;'"\n]+?\s+from\s+)?['"](\.[^'"\n]+)['"];?[ \t]*$/gm;

function resolveRel(fromRel, spec) {
  const p = path.normalize(path.join(path.dirname(fromRel), spec)).split(path.sep).join('/');
  return p;
}

function loadModule(rel) {
  if (modules.has(rel)) return;
  const abs = path.join(root, rel);
  let src = readFileSync(abs, 'utf8');

  // 收集依赖（先于剥除），同时拒绝本打包器不支持的语法
  const deps = [];
  for (const m of src.matchAll(IMPORT_RE)) deps.push(m[1]);
  if (/^\s*import\s*\(/m.test(src)) {
    throw new Error(`${rel}: 不支持动态 import()`);
  }
  if (/^\s*import\b/m.test(src.replace(IMPORT_RE, ''))) {
    throw new Error(`${rel}: 存在无法解析的 import 语句（仅支持单行相对路径导入）`);
  }
  if (/^\s*export\s*[{*]/m.test(src)) {
    throw new Error(`${rel}: 不支持 export { ... } / export * 重导出`);
  }

  // 依赖先行（post-order）
  for (const dep of deps) loadModule(resolveRel(rel, dep));

  src = src.replace(IMPORT_RE, '/* import inlined: $1 */');
  src = src.replace(/^export\s+/gm, '');
  modules.set(rel, src);
}

loadModule(entryRel);

const banner = [
  '/*',
  ' * ⚠️ GENERATED FILE — do not edit. 由 scripts/bundle-content.mjs 生成（npm run build）。',
  ' * 源文件：src/content/content-main.js 及其相对依赖（pii.js / adapters.js）。',
  ' * 经典脚本（非 ESM）：chrome.scripting 动态注册的内容脚本不支持 type:"module"。',
  ' */',
].join('\n');

let body = '';
for (const [rel, src] of modules) {
  body += `\n/* ===== ${rel} ===== */\n${src.trim()}\n`;
}

const bundled = `${banner}
(function () {
  'use strict';
  if (window.__crosschatBootstrapped) return;
  window.__crosschatBootstrapped = true;
${body}
  bootstrap();
})();
`;

writeFileSync(path.join(root, outRel), bundled, 'utf8');
console.log(`bundled ${modules.size} modules -> ${outRel} (${Buffer.byteLength(bundled)} bytes)`);
