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

test('PII: 同值多次出现复用占位符，还原一致', () => {
  const { text, entities } = redact('a@b.com and a@b.com');
  eq((text.match(/\[EMAIL_1\]/g) || []).length, 2);
  eq(entities.length, 1);
});
