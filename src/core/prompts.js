/**
 * Prompt 组装：系统词硬约束 + RAG 2–3 条 + 压缩历史 + PII 占位说明 + 结构化输出。
 */
import { compressHistory, estimateMessagesTokens } from './history.js';

export const SYSTEM_PROMPT_CORE = [
  '你是跨境电商店铺的客服助手，只辅助人工客服起草回复，不代表店铺作出任何承诺。',
  '硬约束：',
  '1. 不得承诺平台政策与知识库之外的退款、赔偿、折扣、免单；金额/时效类承诺必须引用知识库条目。',
  '2. 不得在回复中加入站外链接、联系方式（电话/邮箱/IM 账号）、支付账号或索评利诱内容。',
  '3. 语气简短专业，不加寒暄，英文草稿不超过 150 个单词。',
  '4. 输入中的 [EMAIL_1]/[PHONE_1]/[ADDRESS_1] 等是脱敏占位符，原样保留，不要还原或猜测其内容。',
  '5. 引用知识库时在结尾用 [KB:条目id] 标注；无相关条目时不要编造政策。',
  '6. 只输出 JSON，不要输出任何解释或 Markdown 代码块。',
].join('\n');

export function buildMessages({
  buyerText,
  task = 'draft',
  kbEntries = [],
  history = [],
  recentTurns = 5,
  historySummary = null,
  buyerLanguage = '',
  productCard = null,
}) {
  const systemParts = [SYSTEM_PROMPT_CORE];

  if (task === 'translate') {
    systemParts.push(
      '任务：把买家消息翻译成中文（若已是中文则翻译成英文），保持原意与语气，不增补内容。',
    );
  } else {
    systemParts.push(
      '任务：判断买家意图、风险标签，并用买家语言起草一条客服回复草稿。',
    );
  }

  if (productCard) {
    systemParts.push(`订单/商品卡：${JSON.stringify(productCard)}`);
  }
  if (buyerLanguage) {
    systemParts.push(`买家语言：${buyerLanguage}`);
  }
  if (kbEntries.length) {
    const rag = kbEntries
      .slice(0, 3)
      .map((e) => `- [${e.id}] ${e.answer}`)
      .join('\n');
    systemParts.push(`可引用的店铺知识库（仅可依据以下内容回答政策问题）：\n${rag}`);
  }

  const compressed = compressHistory(history, { recentTurns, summary: historySummary });
  const messages = [{ role: 'system', content: systemParts.join('\n\n') }, ...compressed.messages];
  messages.push({ role: 'user', content: buyerText });
  return messages;
}

export function buildMessagesWithEstimate(opts) {
  const messages = buildMessages(opts);
  return { messages, estimatedInputTokens: estimateMessagesTokens(messages) };
}

/** 要求模型遵守的结构化输出 schema（传给 OpenAI 兼容接口的 response_format 提示词版本） */
export const STRUCTURED_OUTPUT_HINT =
  '输出 JSON schema：{"intent":"logistics|sizing|after_sales|pricing|payment|product|greeting|other",'
  + '"riskFlags":["dispute"|"negative_emotion"|"review"|"payment"|"other"],'
  + '"draft":"<给买家的回复，翻译任务时放译文>",'
  + '"references":["kb-id"]}';
