/**
 * describeArkError 中文归因单测（评审 P0-3）。
 */
import { test, ok } from './harness.mjs';
import { describeArkError, parseStructured } from '../src/core/ark-client.js';

test('Ark 错误归因: 401/403/404/429/5xx 中文提示且保留状态码', () => {
  ok(describeArkError(new Error('Ark API 401: {"error":"invalid key"}')).includes('401'));
  ok(describeArkError(new Error('Ark API 401: x')).includes('API Key 无效'));
  ok(describeArkError(new Error('Ark API 403: x')).includes('403'));
  ok(describeArkError(new Error('Ark API 403: x')).includes('实名'));
  ok(describeArkError(new Error('Ark API 404: x')).includes('404'));
  ok(describeArkError(new Error('Ark API 404: x')).includes('模型 ID'));
  ok(describeArkError(new Error('Ark API 429: x')).includes('429'));
  ok(describeArkError(new Error('Ark API 503: x')).includes('503'));
  ok(describeArkError(new Error('Ark API 500: x')).includes('服务端'));
});

test('Ark 错误归因: 超时 / 网络错误 / 未知错误回退', () => {
  ok(describeArkError(new Error('The operation was aborted')).includes('超时'));
  ok(describeArkError(new Error('Failed to fetch')).includes('网络不可达'));
  const fallback = describeArkError(new Error('weird internal thing'));
  ok(fallback.includes('weird internal thing'));
});

test('parseStructured: 纯 JSON / 夹带文本 / 非法内容', () => {
  ok(parseStructured('{"a":1}').a === 1);
  ok(parseStructured('前缀 {"a":2} 后缀').a === 2);
  ok(parseStructured('') === null);
  ok(parseStructured('no json here') === null);
});
