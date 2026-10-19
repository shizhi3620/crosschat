import { test, ok, eq } from './harness.mjs';
import { redact, restoreDraft, detectPii } from '../src/core/pii.js';

test('PII: 邮箱脱敏并可还原', () => {
  const { text, entities } = redact('reply to buyer42@gmail.com please');
  ok(!text.includes('buyer42@gmail.com'), 'raw email must be gone');
  ok(text.includes('[EMAIL_1]'), 'placeholder present');
  eq(entities[0].type, 'EMAIL');
  eq(restoreDraft('we will email [EMAIL_1] soon', entities), 'we will email buyer42@gmail.com soon');
});

test('PII: 中国手机号 / 美式电话 / 国际号码', () => {
  ok(detectPii('打我手机 13812345678 谢谢').some((e) => e.type === 'PHONE' && e.value.includes('13812345678')));
  ok(detectPii('call (415) 555-0199 today').some((e) => e.type === 'PHONE'));
  ok(detectPii('+44 20 7946 0123').some((e) => e.type === 'PHONE'));
});

test('PII: 英文街道地址', () => {
  const entities = detectPii('I live at 221B Baker Street, London');
  ok(entities.some((e) => e.type === 'ADDRESS'), JSON.stringify(entities));
});

test('PII: 有效信用卡号脱敏（Luhn），无效数字不脱敏', () => {
  const ok1 = redact('card 4111 1111 1111 1111');
  ok(ok1.entities.some((e) => e.type === 'CARD'), 'valid luhn card redacted');
  const no = redact('order #123456789 qty 2');
  ok(!no.entities.some((e) => e.type === 'CARD'), 'order number not treated as card');
  ok(no.entities.length === 0, 'order number not PII at all');
});

test('PII: 越南/巴西/泰国/印尼本地手机号（评审 P1-3 原始复现）', () => {
  ok(detectPii('SĐT của mình là 0901 234 567 nhé').some((e) => e.type === 'PHONE'), 'VN 0901 234 567');
  ok(detectPii('ligue para (11) 98765-4321').some((e) => e.type === 'PHONE'), 'BR (11) 98765-4321');
  ok(detectPii('โทร 081-234-5678').some((e) => e.type === 'PHONE'), 'TH 081-234-5678');
  ok(detectPii('hubungi 0812-3456-7890').some((e) => e.type === 'PHONE'), 'ID 0812-3456-7890');
  ok(detectPii('0901234567').some((e) => e.type === 'PHONE'), 'VN 无分隔符');
});

test('PII: 长订单号/追踪号不能被新电话正则误伤', () => {
  for (const t of ['order #9876543210 qty 1', 'tracking 1234567890123456 has updated', '商品编号 0912 3456 7890 已发货']) {
    const r = redact(t);
    ok(!r.entities.some((e) => e.type === 'PHONE'), `误判电话: ${t} -> ${JSON.stringify(r.entities)}`);
  }
});

test('PII: 同值多次出现复用占位符，还原一致', () => {
  const { text, entities } = redact('a@b.com and a@b.com');
  eq((text.match(/\[EMAIL_1\]/g) || []).length, 2);
  eq(entities.length, 1);
});
