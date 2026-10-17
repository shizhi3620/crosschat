/**
 * L0/L1/L2 分级路由（分级规则）。
 *  - L0：FAQ 强命中，零 Token；
 *  - L1：翻译与常规草拟（翻译永不上旗舰）；
 *  - L2：仅纠纷/A-to-Z/差评/强负面情绪触发，且受配额收紧/强制降级约束。
 * L2 判定必须在模型调用之前完成（用哪一个模型由本模块决定），故全部为本地规则。
 */

export const LEVEL = { L0: 'L0', L1: 'L1', L2: 'L2' };

/** 明确纠纷信号：正常/收紧两种配额状态下都升 L2 */
export const DISPUTE_PATTERNS = [
  /\ba[-\s]?to[-\s]?z\b/i,
  /\bchargeback\b/i,
  /\bcharge back\b/i,
  /\bdispute\b/i,
  /\bcomplaint\b/i,
  /\blawsuit\b|\blawyer\b|\bsue\b|\blegal action\b/i,
  /\bfraud\b|\bscam(?:med)?\b/i,
  /\b(?:1|one)[-\s]?star\b/i,
  /\bnegative review\b|\bbad review\b|\bleave a bad\b/i,
  /差评|投诉|纠纷|拒付|索赔|起诉|律师|12315|315|消协|工商举报|骗子|诈骗/,
];

/** 强负面情绪信号：正常状态可升 L2，配额 80% 收紧后不再单凭情绪升级 */
export const EMOTION_PATTERNS = [
  /\bfurious\b|\boutraged\b|\bdisgusted?\b|\bterrible\b|\bhorrible\b|\bawful\b|\bworst\b|\bunacceptable\b|\bnever again\b/i,
  /垃圾|气死|恶心|太差|再也不买|忍无可忍|过分|欺人太甚/,
];

export function classifyRisk(text) {
  const t = String(text ?? '');
  const disputeHits = DISPUTE_PATTERNS.filter((re) => re.test(t));
  const emotionHits = EMOTION_PATTERNS.filter((re) => re.test(t));

  // 大写+感叹号的强情绪书写：>=3 个大写词或 >=2 个感叹号
  const upperWords = (t.match(/\b[A-Z]{3,}\b/g) || []).length;
  const bangs = (t.match(/[!！]/g) || []).length;
  const shouting = upperWords >= 3 || bangs >= 2;

  return {
    dispute: disputeHits.length > 0,
    strongEmotion: emotionHits.length > 0 || shouting,
    signals: [
      ...(disputeHits.length ? ['dispute'] : []),
      ...(emotionHits.length ? ['negative_emotion'] : []),
      ...(shouting ? ['shouting'] : []),
    ],
  };
}

/**
 * @param {object} input
 * @param {string} input.text            已 PII 脱敏的买家消息
 * @param {'auto'|'translate'|'draft'} [input.task]
 * @param {object|null} [input.faqHit]   knowledge.matchFaq 命中项
 * @param {'normal'|'tighten'|'cap'} [input.quotaPhase]
 * @param {boolean} [input.forceL1]      配置/超额强制 L1
 * @returns {{level:string, reasons:string[], risk:object}}
 */
export function route({
  text = '',
  task = 'auto',
  faqHit = null,
  quotaPhase = 'normal',
  forceL1 = false,
} = {}) {
  const reasons = [];
  const risk = classifyRisk(text);

  // 1) L0：FAQ 强命中（翻译任务除外——翻译是纯 L1）
  if (task !== 'translate' && faqHit) {
    reasons.push(`faq_hit:${faqHit.entry?.id ?? faqHit.id ?? 'unknown'}`);
    return { level: LEVEL.L0, reasons, risk };
  }

  // 2) 翻译永远 L1，即使内容是纠纷（分级规则 硬规则）
  if (task === 'translate') {
    reasons.push('translation_always_l1');
    return { level: LEVEL.L1, reasons, risk };
  }

  // 3) 超额：强制 L1（L0 已在上面短路，不受影响）
  if (forceL1 || quotaPhase === 'cap') {
    reasons.push(forceL1 ? 'forced_l1' : 'monthly_quota_capped');
    return { level: LEVEL.L1, reasons, risk };
  }

  // 4) L2 触发：明确纠纷词必中；情绪信号在 80% 收紧期不再单凭情绪升级
  if (risk.dispute) {
    reasons.push('dispute_signal');
    return { level: LEVEL.L2, reasons, risk };
  }
  if (risk.strongEmotion && quotaPhase !== 'tighten') {
    reasons.push('strong_negative_emotion');
    return { level: LEVEL.L2, reasons, risk };
  }
  if (risk.strongEmotion && quotaPhase === 'tighten') {
    reasons.push('l2_tightened_emotion_kept_l1');
  }

  // 5) 默认 L1
  reasons.push('default_l1');
  return { level: LEVEL.L1, reasons, risk };
}
