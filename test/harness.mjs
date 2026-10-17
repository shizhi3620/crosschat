/**
 * 零依赖单测框架：test(name, fn) 注册，断言失败抛 Error。
 * 所有 *.test.mjs 在 run-tests.mjs 里先 import（注册）再统一执行。
 */
const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function ok(cond, msg) {
  if (!cond) throw new Error(msg || 'expected truthy');
}

export function eq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg || 'eq'}: expected ${e}, got ${a}`);
}

export function approx(actual, expected, tol, msg) {
  if (Math.abs(Number(actual) - expected) > tol) {
    throw new Error(`${msg || 'approx'}: expected ${expected} ± ${tol}, got ${actual}`);
  }
}

export async function runAll() {
  let pass = 0;
  const failures = [];
  for (const { name, fn } of tests) {
    try {
      await fn();
      pass += 1;
      console.log(`  ✓ ${name}`);
    } catch (e) {
      failures.push({ name, error: e });
      console.log(`  ✗ ${name}\n      ${e.message}`);
    }
  }
  console.log(`\n${pass}/${tests.length} passed`);
  if (failures.length) {
    console.error(`\nFAILED (${failures.length})`);
    process.exit(1);
  }
}
