import { test, approx, eq, ok } from './harness.mjs';
import { callCost, projectPer1000, conversationCost, sumEventCosts } from '../src/core/cost-model.js';

/**
 * 典型用量画像 口径（验收基线，独立固定夹具，不随默认配置现价回填而变）：
 * 一次会话 5 轮，每轮 1,200 输入 / 250 输出；每千次 600 万输入 + 125 万输出。
 * L1 ¥0.3/0.6，L2 ¥2/8（每百万 token）；缓存命中价 1.5 折。
 */
const PLAN_PRICING = {
  perMTokens: {
    l1: { input: 0.3, output: 0.6, cached: 0.045 },
    l2: { input: 2, output: 8, cached: 0.3 },
  },
  usageProfile: { turnsPerConversation: 5, inputTokensPerTurn: 1200, outputTokensPerTurn: 250 },
};

test('成本: 单次调用计费（含缓存命中价）', () => {
  // L1: 1,000,000 输入 = ¥0.3；1,000,000 输出 = ¥0.6
  approx(callCost({ prompt: 1_000_000, completion: 1_000_000, level: 'L1', pricing: PLAN_PRICING }), 0.9, 1e-9);
  // 缓存部分按命中价：60 万缓存 + 40 万新鲜输入
  const c = callCost({ prompt: 1_000_000, cached: 600_000, completion: 0, level: 'L1', pricing: PLAN_PRICING });
  approx(c, (400_000 * 0.3 + 600_000 * 0.045) / 1e6, 1e-9);
});

test('成本: 固定夹具基准 无缓存每千次会话（2.6 / 6.5 / 22）', () => {
  const p = projectPer1000(PLAN_PRICING, { cacheHitRate: 0 }).per1000;
  approx(p.l1Only, 2.6, 0.1, `l1Only=${p.l1Only}`);
  approx(p.mix, 6.5, 0.1, `mix=${p.mix}`);
  approx(p.l2Only, 22, 0.1, `l2Only=${p.l2Only}`);
  // 精确口径
  approx(p.l1Only, 2.55, 0.01);
  approx(p.mix, 6.44, 0.01);
  approx(p.l2Only, 22, 0.001);
});

test('成本: 固定夹具基准 60% 缓存命中每千次会话（1.6 / 4.5 / 15.9）', () => {
  const p = projectPer1000(PLAN_PRICING, { cacheHitRate: 0.6 }).per1000;
  approx(p.l1Only, 1.6, 0.1, `l1Only=${p.l1Only}`);
  approx(p.mix, 4.5, 0.1, `mix=${p.mix}`);
  approx(p.l2Only, 15.9, 0.1, `l2Only=${p.l2Only}`);
  approx(p.mix, 4.48, 0.01);
});

test('成本: 单次会话画像 = 5 轮 × (1200 入 / 250 出)', () => {
  const c = conversationCost({ level: 'L1', pricing: PLAN_PRICING });
  approx(c, 0.00255, 1e-5);
});

test('成本: L0 事件零成本；汇总只计 generate', () => {
  const events = [
    { kind: 'generate', level: 'L0', tokens: { prompt: 0, completion: 0, cached: 0 } },
    { kind: 'generate', level: 'L1', tokens: { prompt: 1e6, completion: 1e6, cached: 0 } },
    { kind: 'adopt' },
  ];
  approx(sumEventCosts(events, PLAN_PRICING), 0.9, 1e-9);
  eq(typeof sumEventCosts([], PLAN_PRICING), 'number');
  ok(sumEventCosts([{ kind: 'generate', level: 'L0' }], PLAN_PRICING) === 0);
});
