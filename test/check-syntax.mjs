/**
 * 全量语法检查：node test/check-syntax.mjs
 * 对 src/ 与 test/ 下所有 .js/.mjs 跑 node --check（ESM 由 package.json type:module 识别），
 * 并校验 manifest/knowledge-base 为合法 JSON。
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const targets = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (['.js', '.mjs'].includes(extname(name))) targets.push(p);
  }
}
walk(join(root, 'src'));
walk(join(root, 'test'));
walk(join(root, 'scripts'));

let failed = 0;
for (const file of targets) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (e) {
    failed += 1;
    console.error(`SYNTAX FAIL ${file.replace(root, '')}:\n${e.stderr?.toString() || e.message}`);
  }
}

for (const jsonPath of ['manifest.json', 'src/data/knowledge-base.json', 'package.json']) {
  try {
    JSON.parse(readFileSync(join(root, jsonPath), 'utf8'));
  } catch (e) {
    failed += 1;
    console.error(`JSON FAIL ${jsonPath}: ${e.message}`);
  }
}

console.log(`node --check: ${targets.length - failed}/${targets.length} JS files passed (+ 3 JSON parsed)`);
process.exit(failed ? 1 : 0);
