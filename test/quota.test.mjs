import { test, eq, ok } from './harness.mjs';
import { quotaPhase, monthlyTokens, monthlyL2Share, monthKey } from '../src/core/quota.js';

test('配额: normal / tighten(≥80%) / cap(≥100%) 边界', () => {
  eq(quotaPhase(0, 100, 0.8).phase, 'normal');
  eq(quotaPhase(79, 100, 0.8).phase, 'normal');
  eq(quotaPhase(80, 100, 0.8).phase, 'tighten');
  eq(quotaPhase(99, 100, 0.8).phase, 'tighten');
  eq(quotaPhase(100, 100, 0.8).phase, 'cap');
  eq(quotaPhase(140, 100, 0.8).remainingTokens, 0);
});

test('配额: 月度/店铺 token 汇总只计 generate', () => {
  const events = [
    { kind: 'generate', storeId: 'a', month: '2026-10', tokens: { prompt: 100, completion: 50 } },
    { kind: 'generate', storeId: 'a', month: '2026-09', tokens: { prompt: 999, completion: 999 } },
    { kind: 'generate', storeId: 'b', month: '2026-10', tokens: { prompt: 7, completion: 3 } },
    { kind: 'adopt', storeId: 'a', month: '2026-10' },
  ];
  eq(monthlyTokens(events, { storeId: 'a', month: '2026-10' }), 150);
  eq(monthlyTokens(events, { month: '2026-10' }), 160);
});

test('配额: monthKey 形如 YYYY-MM 并补零', () => {
  eq(monthKey(new Date(2026, 0, 5).getTime()), '2026-01');
});

test('配额: 月度 L2 会话占比按会话去重、L0 不进分母，达硬顶 capped', () => {
  const gen = (cid, level, storeId = 'a', month = '2026-10') =>
    ({ kind: 'generate', level, conversationId: cid, storeId, month });
  const events = [
    gen('c1', 'L2'), gen('c1', 'L1'), // 同会话多次生成只算 1 个 L2 会话
    gen('c2', 'L1'), gen('c3', 'L1'), gen('c4', 'L1'), gen('c5', 'L1'),
    gen('c6', 'L0'), // 零 Token 会话不消耗 L2 预算
    { kind: 'adopt', conversationId: 'c1', storeId: 'a', month: '2026-10' },
    gen('c9', 'L2', 'b'), // 别的店铺
    gen('c8', 'L2', 'a', '2026-09'), // 别的月份
  ];
  const r = monthlyL2Share(events, { storeId: 'a', month: '2026-10', maxShare: 0.2 });
  eq(r.conversations, 5); // c1..c5
  eq(r.l2Conversations, 1);
  eq(r.share, 0.2);
  eq(r.capped, true);
  // 硬顶放宽到 25% 时不再 capped
  eq(monthlyL2Share(events, { storeId: 'a', month: '2026-10', maxShare: 0.25 }).capped, false);
  // 空数据不崩
  const empty = monthlyL2Share([], { storeId: 'a', month: '2026-10' });
  eq(empty.share, 0);
  eq(empty.capped, false);
  ok(empty.conversations === 0);
});
