/**
 * 火山方舟客户端（OpenAI 兼容 /chat/completions）。
 * baseUrl / 模型 ID 全部配置化，可热切换豆包/DeepSeek/Qwen。
 * 在 MV3 service worker 中调用（规避页面 CORS），fetch 可注入以便单测。
 */

export class ArkConfigError extends Error {}

/** batch 半价接口占位：非实时任务（文案批量生成/质检/周报）阶段2接入 */
export const BATCH_RESERVATION = {
  reserved: true,
  endpoint: '/batch',
  status: 'placeholder',
  note: '阶段1 不启用：仅预留非实时任务接口位置，实时草拟不经过 batch。',
};

export function createArkClient(config, { fetchImpl } = {}) {
  const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);

  /**
   * @returns {{content:string, structured:object|null, usage:{prompt:number,completion:number,cached:number}, raw:object}}
   */
  async function chat({
    level = 'L1',
    messages,
    maxTokens = 220,
    temperature = 0.3,
    jsonMode = true,
  }) {
    const model = level === 'L2' ? config.ark.models.l2 : config.ark.models.l1;
    if (!config.ark.apiKey) throw new ArkConfigError('未配置 API Key（BYOK），请在选项页填写或切换到演示模式。');
    if (!doFetch) throw new ArkConfigError('当前环境不支持 fetch。');

    const body = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };
    if (jsonMode) {
      // 火山/OpenAI 兼容；个别模型不支持时由服务端报错，调用方回退到文本解析
      body.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.ark.timeoutMs || 20_000);
    let res;
    try {
      res = await doFetch(`${config.ark.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.ark.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Ark API ${res.status}: ${errText.slice(0, 300)}`);
    }
    const raw = await res.json();
    const content = raw.choices?.[0]?.message?.content ?? '';
    const u = raw.usage || {};
    const cached = u.prompt_tokens_details?.cached_tokens
      ?? u.prompt_cache_hit_tokens
      ?? 0;
    return {
      content,
      structured: parseStructured(content),
      usage: {
        prompt: u.prompt_tokens ?? 0,
        completion: u.completion_tokens ?? 0,
        cached: cached || 0,
      },
      model,
      raw,
    };
  }

  /** 阶段2 批量接口的调用入口：MVP 内显式拒绝，防止误用 */
  async function submitBatch(/* jobs */) {
    throw new Error(`Batch 接口为阶段2 预留：${BATCH_RESERVATION.note}`);
  }

  return { chat, submitBatch, batchReservation: BATCH_RESERVATION };
}

/** 宽容解析模型输出：纯 JSON 直接解析；夹带前后缀文本时截取首个 {...} */
export function parseStructured(content) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
