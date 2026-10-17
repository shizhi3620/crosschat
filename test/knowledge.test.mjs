import { test, ok, eq } from './harness.mjs';
import { search, matchFaq, renderAnswer, tokenize } from '../src/core/knowledge.js';
import kb from '../src/data/knowledge-base.json' with { type: 'json' };

test('知识库: tokenize 兼容中英文', () => {
  ok(tokenize('how long does shipping take').includes('shipping'));
  const zh = tokenize('物流多久到货');
  ok(zh.includes('物流') && zh.includes('多久'), zh.join(','));
});

test('知识库: Top-K 检索按相关度排序且不超过 3 条', () => {
  const hits = search(kb, 'where is my order and the tracking number?', { intent: 'logistics', topK: 3 });
  ok(hits.length <= 3);
  ok(hits[0].entry.id === 'tracking', hits[0].entry.id);
});

test('知识库: L0 强命中（明确 FAQ 问题）与不命中（闲聊）', () => {
  const hit = matchFaq(kb, 'how long does shipping take?', { intent: 'logistics' });
  ok(hit && hit.entry.id === 'shipping-time');
  const zh = matchFaq(kb, '怎么查快递单号', { intent: 'logistics' });
  ok(zh && zh.entry.id === 'tracking');
  ok(matchFaq(kb, 'hello are you there') === null);
});

test('知识库: 模板变量渲染，缺失变量保留占位', () => {
  eq(renderAnswer('ETA {eta}; order {orderId}', { eta: 'Friday' }), 'ETA Friday; order {orderId}');
});
