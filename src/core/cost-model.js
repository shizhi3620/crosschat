/**
 * 成本模型（典型用量画像）。
 * 单价单位：CNY / 百万 token。缓存命中价在 pricing.perMTokens[l].cached 配置。
 */

/** 单次模型调用成本（元） */
export function callCost({ prompt = 0, completion = 0, cached = 0, level = 'L1', pricing }) {
  const tier = level === 'L2' ? 'l2' : 'l1';
  const p = pricing.perMTokens[tier];
  const cachedTokens = Math.max(0, Math.min(cached, prompt));
  const freshInput = prompt - cachedTokens;
  return (
    (freshInput * p.input) / 1_000_000 +
    (cachedTokens * p.cached) / 1_000_000 +
    (completion * p.output) / 1_000_000
  );
}

/** 单次会话（多轮）的理论成本，按 典型用量画像 用量画像与缓存命中率折算 */
export function conversationCost({
  level = 'L1',
  pricing,
  cacheHitRate = 0,
  usageProfile = pricing.usageProfile,
}) {
  const { turnsPerConversation, inputTokensPerTurn, outputTokensPerTurn } = usageProfile;
  const prompt = turnsPerConversation * inputTokensPerTurn;
  const completion = turnsPerConversation * outputTokensPerTurn;
  return callCost({
    prompt,
    completion,
    cached: Math.round(prompt * cacheHitRate),
    level,
    pricing,
  });
}

/**
 * 典型用量画像 每千次会话成本测算。
 * @param {object} pricing
 * @param {{l1:number, l2:number}} [mix] 路由占比（不含 L0；L0 零 Token 由看板单独体现）
 * @param {number} [cacheHitRate]
 * @returns {{per1000:{l1Only:number,mix:number,l2Only:number}, perConversation:{l1Only:number,mix:number,l2Only:number}}
 */
export function projectPer1000(pricing, { mix = { l1: 0.8, l2: 0.2 }, cacheHitRate = 0 } = {}) {
  const cL1 = conversationCost({ level: 'L1', pricing, cacheHitRate });
  const cL2 = conversationCost({ level: 'L2', pricing, cacheHitRate });
  const cMix = cL1 * mix.l1 + cL2 * mix.l2;
  return {
    perConversation: {
      l1Only: round4(cL1),
      mix: round4(cMix),
      l2Only: round4(cL2),
    },
    per1000: {
      l1Only: round2(cL1 * 1000),
      mix: round2(cMix * 1000),
      l2Only: round2(cL2 * 1000),
    },
  };
}

/** 从实际计量事件汇总实际现金成本（元） */
export function sumEventCosts(events, pricing) {
  let total = 0;
  for (const e of events || []) {
    if (e.kind !== 'generate' || e.level === 'L0') continue;
    const t = e.tokens || {};
    total += callCost({
      prompt: t.prompt || 0,
      completion: t.completion || 0,
      cached: t.cached || 0,
      level: e.level,
      pricing,
    });
  }
  return round4(total);
}

function round2(x) {
  return Math.round(x * 100) / 100;
}
function round4(x) {
  return Math.round(x * 10000) / 10000;
}
