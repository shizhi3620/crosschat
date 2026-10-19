import { test, ok, eq } from './harness.mjs';
import { scan } from '../src/core/compliance.js';

const block = (text, ctx) => scan(text, ctx).verdict === 'block';
const hasRule = (r, id) => r.findings.some((f) => f.ruleId === id);

test('合规: 外链 block（裸域名/短链/非平台域名）', () => {
  const r1 = scan('please file your claim here: http://example.com/claim');
  eq(r1.verdict, 'block');
  ok(hasRule(r1, 'offsite_link'));
  const r2 = scan('track via https://bit.ly/abc123 thanks');
  ok(r2.verdict === 'block', 'short link blocked');
  ok(hasRule(r2, 'offsite_link'));
});

test('合规: 平台官方域名链接不误伤（Shopee）', () => {
  const r = scan('You can track the parcel at https://shopee.com.my/order/12345.');
  eq(r.verdict, 'pass', JSON.stringify(r.findings));
});

test('合规: 联系方式 block（IM/电话/邮箱，多语种）', () => {
  const cases = [
    'add me on whatsapp: +1 415 555 0199',
    '加我微信 wx_seller88 聊',
    'line id: happy.store',
    'contact me on telegram @happystore',
    '加我QQ 123456789',
    'email me at seller@offsite.com',
    '拨打 13812345678 直接联系',
  ];
  for (const t of cases) {
    const r = scan(t);
    eq(r.verdict, 'block', `should block: ${t} -> ${JSON.stringify(r.findings.map((f) => f.ruleId))}`);
  }
});

test('合规: 索评利诱 block（中英文）', () => {
  const zh = scan('满意的话麻烦给个五星好评，我们返现5元到您账户');
  eq(zh.verdict, 'block');
  ok(hasRule(zh, 'review_incentive'));
  const zh2 = scan('您先改好评，我们立刻给您退款');
  ok(hasRule(zh2, 'review_incentive'), '改好评退款');
  const en = scan('If you leave a 5-star review, we will give you a full refund and a gift card.');
  eq(en.verdict, 'block');
  ok(hasRule(en, 'review_incentive'));
});

test('合规: 站外支付导流 block（PayPal/支付宝/西联/银行转账）', () => {
  for (const t of ['pay via paypal to save fees', '我们用支付宝收款给您9折', 'please send by western union', '可以银行转账给您便宜点']) {
    const r = scan(t);
    eq(r.verdict, 'block', t);
    ok(hasRule(r, 'offsite_payment'), t);
  }
});

test('合规: 东南亚/南美本地支付渠道 block（评审 P1-4 原始复现 + 同区渠道）', () => {
  const cases = [
    'Thanh toan qua ZaloPay nhe',          // 评审原复现：\bzalo\b 放行了 zalopay
    'Thanh toán qua MoMo nhé',
    'bisa bayar pakai GoPay',
    'silakan bayar lewat DANA',
    'pague via pix, chave: 1198765-4321',
    'pay via PromptPay',
    'top up with TrueMoney',
  ];
  for (const t of cases) {
    const r = scan(t);
    eq(r.verdict, 'block', `should block: ${t} -> ${JSON.stringify(r.findings.map((f) => f.ruleId))}`);
    ok(hasRule(r, 'offsite_payment'), t);
  }
});

test('合规: DANA/OVO/Pix 普通词语境不误伤（品牌词消歧，评审 P1-4）', () => {
  const benign = [
    'Hi Dana, thanks for contacting us about your order.',
    'Vou enviar um ovo de Páscoa como brinde junto com o pedido.',
    'Your parcel is in transit; please contact us through Shopee chat.',
  ];
  for (const t of benign) {
    const r = scan(t);
    ok(!hasRule(r, 'offsite_payment'), `false offsite_payment: ${t}`);
    eq(r.verdict, 'pass', `unexpected finding: ${t} -> ${JSON.stringify(r.findings.map((f) => f.ruleId))}`);
  }
});

test('合规: 越南/巴西手机号进入电话规则（P1-3 与 PII 同形）', () => {
  const r = scan('liên hệ sđt 0901 234 567 để được hỗ trợ');
  eq(r.verdict, 'block');
  ok(hasRule(r, 'contact_phone_email'));
  const r2 = scan('ligue para (11) 98765-4321');
  ok(hasRule(r2, 'contact_phone_email'));
});

test('合规: 加密货币 warn（不直接 block）', () => {
  const r = scan('we can accept USDT for this order');
  eq(r.verdict, 'warn');
  ok(hasRule(r, 'crypto_payment'));
});

test('合规: Amazon 店铺促销内容 warn（主动消息规则）', () => {
  const r = scan('Check out our store for a 10% discount coupon this week!', { platform: 'amazon' });
  eq(r.verdict, 'warn', JSON.stringify(r.findings));
  ok(hasRule(r, 'amazon_proactive_message'));
  // 非 Amazon 店铺上下文不触发该规则
  const r2 = scan('Check out our store for a 10% discount coupon this week!', { platform: 'shopee' });
  ok(!hasRule(r2, 'amazon_proactive_message'));
});

test('合规: 正常客服消息不误伤（中英多语）', () => {
  const benign = [
    'Thanks for contacting us. Your refund has been issued through Shopee and should reach your account in 1–3 business days. Please reply here if you have any questions.',
    '您好，退货申请已通过平台审核，货款将原路退回您的支付账户，请注意查收。如有问题请在平台聊天内联系我们。',
    'Your parcel is in transit; tracking shows delivery by Friday. Contact us via Shopee chat if you need further help.',
    'Sorry about the delay — the tracking status will update within 24–48 hours.',
    '如果满意我们的服务，欢迎在平台内留下您的真实评价。',
  ];
  for (const t of benign) {
    const r = scan(t, { platform: 'amazon' });
    eq(r.verdict, 'pass', `false positive: ${t} -> ${JSON.stringify(r.findings.map((f) => f.ruleId))}`);
  }
});
