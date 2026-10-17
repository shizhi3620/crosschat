/**
 * 上下文压缩（上下文压缩）：只送最近 N 轮，更早的历史先摘要后入模。
 */

/** 粗估 token：CJK 字符约 1 token/字，拉丁文本约 1 token/4 字符 */
export function estimateTokens(text) {
  const s = String(text ?? '');
  const cjk = (s.match(/[一-龥぀-ヿ가-힯]/g) || []).length;
  const other = s.length - cjk;
  return Math.ceil(cjk + other / 4);
}

export function estimateMessagesTokens(messages) {
  return (messages || []).reduce(
    (sum, m) => sum + estimateTokens(m.content) + 4, // +4 每条消息的结构开销
    0,
  );
}

/**
 * @param {Array<{role:'user'|'assistant', content:string}>} turns 按时间正序
 * @param {{recentTurns?: number, summary?: string|null}} [opts]
 * @returns {{olderTurns:number, summary:string|null, recent:object[], messages:object[]}}
 *   messages 可直接拼到请求里：有摘要时放一条 system 摘要，再接最近 N 轮
 */
export function compressHistory(turns, { recentTurns = 5, summary = null } = {}) {
  const all = turns || [];
  const recent = all.slice(-recentTurns);
  const olderTurns = Math.max(0, all.length - recent.length);
  const messages = [];
  if (olderTurns > 0 && summary) {
    messages.push({
      role: 'system',
      content: `Earlier conversation summary (do not quote verbatim, use as context): ${summary}`,
    });
  }
  messages.push(...recent.map((t) => ({ role: t.role, content: t.content })));
  return { olderTurns, summary: olderTurns > 0 ? summary : null, recent, messages };
}

/** 是否已经有需要摘要但尚无摘要的旧轮次（驱动后台一次性 L1 摘要） */
export function needsSummary(turns, { recentTurns = 5, summary = null } = {}) {
  return (turns || []).length > recentTurns && !summary;
}
