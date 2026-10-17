import { test, ok, eq } from './harness.mjs';
import { runPipeline } from '../src/core/pipeline.js';
import { DEFAULT_CONFIG, deepMerge } from '../src/core/defaults.js';

const demo = () => deepMerge(DEFAULT_CONFIG, {});

test('端到端: 演示模式 FAQ 物流咨询 → L0 零 Token + 知识库引用 + 合规通过', async () => {
  const r = await runPipeline({
    message: { text: 'Hi, how long does shipping take? When will my order arrive?', conversationId: 'c1' },
    config: demo(),
  });
  eq(r.level, 'L0');
  eq(r.usage.tokens.prompt, 0);
  eq(r.usage.tokens.completion, 0);
  ok(r.references.includes('shipping-time'));
  eq(r.compliance.verdict, 'pass');
  ok(r.draft.length > 20);
  eq(r.event.kind, 'generate');
  eq(r.event.level, 'L0');
});

test('端到端: A-to-Z 纠纷 → L2；售后模板不违规', async () => {
  const r = await runPipeline({
    message: { text: 'This is TERRIBLE!!! I will open an A-to-z claim now!!!', conversationId: 'c2' },
    config: demo(),
  });
  eq(r.level, 'L2');
  ok(r.risk.dispute);
  eq(r.compliance.verdict, 'pass');
});

test('端到端: 翻译任务永远 L1', async () => {
  const r = await runPipeline({
    message: { text: 'where is my order?', conversationId: 'c3' },
    task: 'translate',
    config: demo(),
  });
  eq(r.level, 'L1');
  ok(r.translated.includes('订单') || r.translated.includes('演示模式'));
});

function spyArk(payloads = []) {
  const calls = [];
  return {
    calls,
    client: {
      async chat(req) {
        calls.push(req);
        const payload = payloads.shift() || {
          intent: 'after_sales', riskFlags: [], draft: 'Please contact us through the platform.', references: [],
        };
        return {
          content: JSON.stringify(payload),
          structured: payload,
          usage: { prompt: 1234, completion: 88, cached: 0 },
          model: 'spy-model',
        };
      },
    },
  };
}

test('端到端: BYOK 模式入模文本已 PII 脱敏（原文不进入 prompt），并带结构化输出约束', async () => {
  const config = deepMerge(DEFAULT_CONFIG, { mode: 'byok', ark: { apiKey: 'test-key' } });
  const spy = spyArk();
  const r = await runPipeline({
    message: { text: 'please call me urgently — email me at victim@example.com today', conversationId: 'c4' },
    config,
    clients: { ark: spy.client },
  });
  eq(r.level, 'L1');
  const flat = JSON.stringify(spy.calls[0].messages);
  ok(!flat.includes('victim@example.com'), 'raw email must not leave the machine');
  ok(flat.includes('[EMAIL_1]'), 'placeholder must be in model input');
  ok(flat.includes('不得承诺'), 'system hard constraints included');
  eq(r.entities[0].type, 'EMAIL');
  eq(spy.calls[0].maxTokens, config.costControl.maxOutputTokens);
  eq(r.model, 'spy-model');
});

test('端到端: 模型草稿含 PayPal 站外支付 → 合规 block，不提供自动发送路径', async () => {
  const config = deepMerge(DEFAULT_CONFIG, { mode: 'byok', ark: { apiKey: 'test-key' } });
  const spy = spyArk([{
    intent: 'after_sales', riskFlags: [],
    draft: 'Sorry, send the money to paypal.me/badstore and we will refund.', references: [],
  }]);
  const r = await runPipeline({
    message: { text: 'I have a serious complaint about this transaction', conversationId: 'c5' },
    config,
    clients: { ark: spy.client },
  });
  eq(r.blocked, true);
  eq(r.compliance.verdict, 'block');
  ok(r.compliance.findings.some((f) => f.ruleId === 'offsite_payment'));
  eq(r.event.complianceVerdict, 'block');
});

test('端到端: 配额 cap 时纠纷消息也被强制到 L1', async () => {
  const config = deepMerge(DEFAULT_CONFIG, { mode: 'byok', ark: { apiKey: 'test-key' } });
  const spy = spyArk();
  const r = await runPipeline({
    message: { text: 'I am opening a chargeback and a dispute', conversationId: 'c6' },
    config,
    quotaPhase: 'cap',
    clients: { ark: spy.client },
  });
  eq(r.level, 'L1');
  eq(spy.calls[0].level, 'L1');
  eq(r.error, null);
  eq(r.model, 'spy-model');
});

test('端到端: Ark 报错时返回 error 且不产生计量计费事件', async () => {
  const config = deepMerge(DEFAULT_CONFIG, { mode: 'byok', ark: { apiKey: 'test-key' } });
  const r = await runPipeline({
    message: { text: 'I have a serious complaint about this transaction', conversationId: 'c7' },
    config,
    clients: { ark: { async chat() { throw new Error('Ark API 401'); } } },
  });
  ok(r.error.includes('401'), r.error);
  eq(r.event.tokens.prompt, 0);
  eq(r.event.tokens.completion, 0);
});
