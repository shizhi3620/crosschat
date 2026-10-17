import { test, ok, eq } from './harness.mjs';
import { route, classifyRisk } from '../src/core/router.js';

const faq = { entry: { id: 'shipping-time' } };

test('路由: FAQ 强命中走 L0（零 Token）', () => {
  const r = route({ text: 'how long does shipping take?', faqHit: faq });
  eq(r.level, 'L0');
  ok(r.reasons[0].startsWith('faq_hit'));
});

test('路由: 常规售前/议价消息走 L1', () => {
  for (const t of ['do you have this in blue?', 'can you give me a better price?', '请问这个有货吗']) {
    eq(route({ text: t }).level, 'L1', t);
  }
});

test('路由: 纠纷 / A-to-Z / 差评 / 投诉 走 L2（中英文）', () => {
  const l2 = [
    'I will open an A-to-Z claim',
    'this is a scam, I am filing a chargeback',
    '你们这是欺诈，我要投诉',
    '产品太差了，已经给了差评',
    'I am contacting my lawyer',
  ];
  for (const t of l2) eq(route({ text: t }).level, 'L2', t);
});

test('路由: 强负面情绪（尖叫/大写）正常期走 L2', () => {
  const r = route({ text: 'THIS IS TERRIBLE!!! SO ANGRY!!! WORST EVER' });
  eq(r.level, 'L2');
  ok(r.reasons.includes('strong_negative_emotion'));
});

test('路由: 配额 80% 收紧期，仅凭情绪留 L1；明确纠纷仍 L2', () => {
  const emotion = route({ text: 'THIS IS TERRIBLE!!! SO ANGRY!!!', quotaPhase: 'tighten' });
  eq(emotion.level, 'L1');
  ok(emotion.reasons.includes('l2_tightened_emotion_kept_l1'));
  const dispute = route({ text: 'I WILL OPEN A DISPUTE NOW!!!', quotaPhase: 'tighten' });
  eq(dispute.level, 'L2');
});

test('路由: 超额 cap 强制 L1（即使明确纠纷），但不影响 L0', () => {
  eq(route({ text: 'I will open a chargeback', quotaPhase: 'cap', forceL1: true }).level, 'L1');
  eq(route({ text: 'how long is shipping', faqHit: faq, quotaPhase: 'cap', forceL1: true }).level, 'L0');
});

test('路由: 翻译任务永远 L1（纠纷内容也不升旗舰）', () => {
  const r = route({ text: 'I WILL SUE AND OPEN AN A-TO-Z CLAIM', task: 'translate' });
  eq(r.level, 'L1');
  ok(r.reasons.includes('translation_always_l1'));
  // FAQ 命中也不能让翻译走 L0
  eq(route({ text: 'shipping time?', task: 'translate', faqHit: faq }).level, 'L1');
});

test('路由: 风险分类信号字段', () => {
  eq(classifyRisk('普通咨询，谢谢').dispute, false);
  ok(classifyRisk('I want a refund and a chargeback').dispute);
  ok(classifyRisk('NEVER AGAIN!!! TERRIBLE!!!').strongEmotion);
});
