import { test, ok, eq } from './harness.mjs';
import { classifyIntent, demoTranslate, generateDemo, INTENTS } from '../src/core/demo-engine.js';
import { scan } from '../src/core/compliance.js';

test('演示引擎: 意图识别（中英）', () => {
  eq(classifyIntent('where is my order? tracking please'), INTENTS.logistics);
  eq(classifyIntent('do you have a larger size?'), INTENTS.sizing);
  eq(classifyIntent('the item arrived broken, refund'), INTENTS.after_sales);
  eq(classifyIntent('可以便宜点吗 有优惠券吗'), INTENTS.pricing);
  eq(classifyIntent('hello'), INTENTS.greeting);
});

test('演示引擎: 内置短语册双向翻译，未命中给带标注占位译文', () => {
  eq(demoTranslate('Where is my order?'), '我的订单到哪了？');
  ok(demoTranslate('可以退货吗').includes('return'));
  ok(demoTranslate('zzz qwerty unknown phrase').includes('演示模式'));
});

test('演示引擎: 每个意图的兜底草稿均通过合规扫描（不越权承诺/不留联系方式）', () => {
  for (const intent of Object.values(INTENTS)) {
    const out = generateDemo({ text: 'question', intent, kbEntries: [], level: 'L1' });
    ok(out.draft.length > 20, `${intent} draft nonempty`);
    const r = scan(out.draft);
    eq(r.verdict, 'pass', `${intent}: ${r.findings.map((f) => f.ruleId).join(',')} :: ${out.draft}`);
  }
});

test('演示引擎: 命中知识库时附引用且不超过 3 条', () => {
  const kb = [
    { entry: { id: 'a', answer: 'AAA' }, score: 5 },
    { entry: { id: 'b', answer: 'BBB' }, score: 4 },
    { entry: { id: 'c', answer: 'CCC' }, score: 3 },
    { entry: { id: 'd', answer: 'DDD' }, score: 2 },
  ];
  const out = generateDemo({ text: 'q', intent: 'logistics', kbEntries: kb, level: 'L1' });
  eq(out.references, ['a', 'b', 'c']);
});
