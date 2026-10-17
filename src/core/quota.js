/**
 * 每店月度配额与自动降级（月度配额与自动降级）：
 * 用量 ≥80% 收紧 L2（仅凭情绪不升级），≥100% 强制 L1。
 */

export function monthKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {number} usedTokens 当月该店已用 token（输入+输出+缓存命中）
 * @param {number} quotaTokens
 * @param {number} [tightenAt]
 * @returns {{phase:'normal'|'tighten'|'cap', ratio:number, remainingTokens:number}}
 */
export function quotaPhase(usedTokens, quotaTokens, tightenAt = 0.8) {
  const ratio = quotaTokens > 0 ? usedTokens / quotaTokens : 0;
  let phase = 'normal';
  if (ratio >= 1) phase = 'cap';
  else if (ratio >= tightenAt) phase = 'tighten';
  return {
    phase,
    ratio: Math.round(ratio * 10000) / 10000,
    remainingTokens: Math.max(0, quotaTokens - usedTokens),
  };
}

/** 汇总事件中某店某月已用 token */
export function monthlyTokens(events, { storeId, month }) {
  let used = 0;
  for (const e of events || []) {
    if (e.kind !== 'generate') continue;
    if (storeId && e.storeId !== storeId) continue;
    if (month && e.month !== month) continue;
    const t = e.tokens || {};
    used += (t.prompt || 0) + (t.completion || 0);
  }
  return used;
}

/**
 * 当月某店「付费模型会话」中 L2 会话占比（成本控制 routing.maxL2Share）。
 * 按 conversationId 去重：同一会话只要有过一次 L2 生成即计为 L2 会话；
 * 分母只计 L1/L2 会话（L0 零 Token 会话不消耗 L2 预算）。
 *
 * @returns {{conversations:number, l2Conversations:number, share:number, capped:boolean}}
 */
export function monthlyL2Share(events, { storeId, month, maxShare = 0.2 } = {}) {
  const l2Convs = new Set();
  const paidConvs = new Set();
  for (const e of events || []) {
    if (e.kind !== 'generate') continue;
    if (!e.level || e.level === 'L0') continue;
    if (storeId && e.storeId !== storeId) continue;
    if (month && e.month !== month) continue;
    const cid = e.conversationId || `__anon_${paidConvs.size}`;
    paidConvs.add(cid);
    if (e.level === 'L2') l2Convs.add(cid);
  }
  const conversations = paidConvs.size;
  const share = conversations ? l2Convs.size / conversations : 0;
  return {
    conversations,
    l2Conversations: l2Convs.size,
    share: Math.round(share * 10000) / 10000,
    capped: share >= maxShare,
  };
}
