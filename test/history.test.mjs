import { test, ok, eq } from './harness.mjs';
import { compressHistory, needsSummary, estimateTokens } from '../src/core/history.js';

const turns = Array.from({ length: 7 }, (_, i) => ({
  role: i % 2 ? 'assistant' : 'user',
  content: `msg number ${i} with some content`,
}));

test('历史压缩: 保留最近 5 轮，更早的有摘要则前置 system 摘要', () => {
  const c = compressHistory(turns, { recentTurns: 5, summary: 'buyer asked about shipping' });
  eq(c.olderTurns, 2);
  eq(c.recent.length, 5);
  eq(c.messages.length, 6);
  eq(c.messages[0].role, 'system');
  ok(c.messages[0].content.includes('shipping'));
});

test('历史压缩: 无摘要时直接丢弃旧轮次（标记需要摘要）', () => {
  const c = compressHistory(turns, { recentTurns: 5 });
  eq(c.olderTurns, 2);
  eq(c.messages.length, 5);
  ok(needsSummary(turns, { recentTurns: 5 }));
  ok(!needsSummary(turns, { recentTurns: 5, summary: 's' }));
  ok(!needsSummary(turns.slice(0, 3), { recentTurns: 5 }));
});

test('token 估算: 中文按字、拉丁文本按字符/4', () => {
  ok(estimateTokens('物流时效') >= 4);
  ok(estimateTokens('a'.repeat(40)) <= 12);
});
