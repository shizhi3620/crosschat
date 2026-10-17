import { test, ok, eq, approx } from './harness.mjs';
import { makeGenerateEvent, makeAdoptEvent, summarize } from '../src/core/metering.js';

const pricing = {
  perMTokens: {
    l1: { input: 0.3, output: 0.6, cached: 0.045 },
    l2: { input: 2, output: 8, cached: 0.3 },
  },
};

const ts = new Date(2026, 9, 10).getTime();
let n = 0;
const gen = (level, storeId, conv, extra = {}) => makeGenerateEvent({
  storeId,
  conversationId: conv,
  level,
  model: level === 'L0' ? 'rules' : 'm',
  tokens: extra.tokens || { prompt: 6000, completion: 1000, cached: level === 'L1' ? 3000 : 0 },
  cacheHit: extra.cacheHit ?? level === 'L1',
  firstResponseMs: extra.fr ?? 10_000 + n * 1000,
  complianceVerdict: extra.verdict || 'pass',
  ts: ts + (n += 1) * 1000,
});

const events = [
  gen('L0', 'a', 'c1'),
  gen('L1', 'a', 'c2'),
  gen('L1', 'a', 'c3'),
  gen('L2', 'a', 'c4', { verdict: 'block' }),
  gen('L1', 'b', 'c5'),
  makeAdoptEvent({ storeId: 'a', conversationId: 'c2', ts }),
  makeAdoptEvent({ storeId: 'a', conversationId: 'c4', ts }),
];

test('计量: 分级分布/逐店/拦截/缓存命中', () => {
  const s = summarize(events, { pricing, month: '2026-10' });
  eq(s.total, 5);
  eq(s.levelCounts, { L0: 1, L1: 3, L2: 1 });
  approx(s.levelShare.L0, 0.2, 1e-9);
  eq(s.byStore.length, 2);
  const a = s.byStore.find((x) => x.storeId === 'a');
  eq(a.count, 4);
  eq(a.blocked, 1);
  eq(s.blockedCount, 1);
  approx(s.cacheHitRate, 3 / 5, 1e-9);
});

test('计量: AI 采纳率按会话去重（2/5）', () => {
  const s = summarize(events, { pricing, month: '2026-10' });
  approx(s.adoptionRate, 2 / 5, 1e-9);
});

test('计量: 首响中位数与估算成本为正', () => {
  const s = summarize(events, { pricing, month: '2026-10' });
  ok(s.firstResponseMsMedian >= 10_000, `median=${s.firstResponseMsMedian}`);
  ok(s.cost > 0);
  const b = s.byStore.find((x) => x.storeId === 'b');
  ok(b.cost > 0);
});

test('计量: 空数据不崩，比率为 null/0', () => {
  const s = summarize([], { pricing, month: '2026-10' });
  eq(s.total, 0);
  eq(s.adoptionRate, null);
  eq(s.cost, 0);
});
