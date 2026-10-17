/**
 * 本地演示引擎（无 Key / 离线可试用）：规则意图识别 + 模板草拟 + 小型双语短语册。
 * 与真实 Ark 调用返回同构结构，pipeline 可无缝切换。模板严格遵守合规硬约束
 * （不承诺超权限退款/折扣、不留联系方式、不索评）。
 */
import { estimateTokens } from './history.js';

export const INTENTS = {
  logistics: 'logistics',
  sizing: 'sizing',
  after_sales: 'after_sales',
  pricing: 'pricing',
  payment: 'payment',
  product: 'product',
  greeting: 'greeting',
  other: 'other',
};

const INTENT_KEYWORDS = [
  [INTENTS.logistics, ['shipping', 'delivery', 'track', 'where is my order', 'arrive', '物流', '快递', '到货', '发货', '什么时候到', '单号', '没收到']],
  [INTENTS.sizing, ['size', 'fit', 'small', 'large', 'measurement', '尺码', '大小', '偏大', '偏小', '尺寸']],
  [INTENTS.after_sales, ['return', 'refund', 'broken', 'damaged', 'wrong item', 'defect', '退货', '退款', '售后', '坏了', '破损', '质量', '换货']],
  [INTENTS.pricing, ['discount', 'cheaper', 'price', 'coupon', 'best price', '优惠', '便宜', '打折', '价格', '减点']],
  [INTENTS.payment, ['pay', 'payment', 'invoice', '支付', '付款', '发票']],
  [INTENTS.product, ['material', 'color', 'stock', 'available', '材质', '颜色', '有货', '库存', '面料']],
  [INTENTS.greeting, ['hello', 'hi', 'hey', '你好', '在吗', '您好']],
];

export function classifyIntent(text) {
  const t = String(text ?? '').toLowerCase();
  let best = INTENTS.other;
  let bestHits = 0;
  for (const [intent, kws] of INTENT_KEYWORDS) {
    const hits = kws.reduce((n, kw) => n + (t.includes(kw) ? 1 : 0), 0);
    if (hits > bestHits) {
      bestHits = hits;
      best = intent;
    }
  }
  return best;
}

/** 小型短语册：命中即给真实翻译，未命中给带标注的占位译文 */
const PHRASEBOOK = [
  [/where is my order/i, '我的订单到哪了？'],
  [/how long does shipping take/i, '物流需要多长时间？'],
  [/can i return this/i, '这个可以退货吗？'],
  [/do you have.*size|do you have.*larger/i, '有大一号的吗？'],
  [/it is damaged|it's damaged|arrived damaged/i, '商品到货时已破损。'],
  [/i want a refund/i, '我要退款。'],
  [/hello|hi there/i, '你好！'],
  [/thank you/i, '谢谢！'],
  [/我的订单到哪了|物流到哪/, 'Where is my order?'],
  [/多久到货|几天到/, 'How long does shipping take?'],
  [/可以退货吗|怎么退货/, 'Can I return this item?'],
  [/有大一号的吗|尺码偏小/, 'Do you have a larger size?'],
  [/东西坏了|收到是破的/, 'The item arrived damaged.'],
  [/我要退款|申请退款/, 'I would like a refund.'],
  [/你好|在吗/, 'Hello!'],
  [/谢谢/, 'Thank you!'],
];

export function demoTranslate(text) {
  for (const [re, translated] of PHRASEBOOK) {
    if (re.test(String(text ?? ''))) return translated;
  }
  return `【演示模式｜未配置 Ark Key，此为占位译文】${text}`;
}

const KB_INTENT_FALLBACK = {
  logistics:
    'Thanks for your message. Your order is in transit; standard delivery takes 7–15 business days and a tracking number is available in your order details.',
  sizing:
    'Thanks for your message. The item fits true to size; please check the size chart in the product images and choose one size up if you are between sizes.',
  after_sales:
    'We are sorry about the issue. Please open a return/refund request through the platform with a photo, and our team will handle it according to the platform policy promptly.',
  pricing:
    'Thanks for your inquiry. The current listing price is already our best store offer; keep an eye on our store for upcoming platform promotions.',
  payment:
    'Payment is processed securely through the platform at checkout. Please complete payment within the platform to keep your order protected.',
  product:
    'Thanks for your question. Product details including material and available colors are shown in the listing images and description.',
  greeting: 'Hello! Thanks for contacting our store. How may we help you today?',
  other:
    'Thanks for reaching out. Could you share a few more details (order number and a photo if applicable)? We will check and get back to you shortly.',
};

/**
 * @param {object} p
 * @param {string} p.text 已脱敏文本
 * @param {string} p.intent
 * @param {Array} p.kbEntries 检索到的知识库条目（已切片 Top-K）
 * @param {string} p.level 路由层级
 * @returns {{intent, riskFlags, draft, references, tokens, model}}
 */
export function generateDemo({ text, intent, kbEntries = [], level }) {
  const top = kbEntries[0];
  let draft;
  const references = [];
  if (top && (top.answer || top.entry?.answer)) {
    const entry = top.entry || top;
    draft = /[一-龥]/.test(text) ? entry.answerZh || entry.answer : entry.answer;
    references.push(entry.id);
    // 第二、三条作为补充政策依据（不超过 3 条，降本手段 2）
    for (const extra of kbEntries.slice(1, 3)) {
      const e = extra.entry || extra;
      if (!references.includes(e.id)) references.push(e.id);
    }
  } else {
    draft = KB_INTENT_FALLBACK[intent] || KB_INTENT_FALLBACK.other;
  }

  const prompt = `${intent}|${level}|${(kbEntries || []).map((e) => (e.entry || e).id).join(',')}`;
  return {
    intent,
    riskFlags: level === 'L2' ? ['negative_emotion'] : [],
    draft,
    references,
    model: 'local-demo-engine',
    tokens: {
      prompt: estimateTokens(prompt) + 200, // 演示计量：含系统词的近似固定开销
      completion: estimateTokens(draft),
      cached: 0,
    },
  };
}
