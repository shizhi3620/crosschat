/**
 * CrossChat 默认配置（v1.0.0）。
 *
 * 所有模型 ID / 单价 / 配额均为可配置项，不硬编码进逻辑代码：
 *  - 模型 ID 与单价取自火山方舟官方价目（2026-10-15，cn-beijing，
 *    元/百万 token），见 pricing.priceDate / pricing.source；
 *  - 单价随官方价目变动时在此更新即可，看板成本与基准表即时反映。
 */

export const STORAGE_KEYS = {
  config: 'crosschat.config.v1',
  events: 'crosschat.meter.v1',
  // 匿名遥测状态 {clientId,lastDay,enabled}、用户自选站点 patterns、托管额度等待名单（本机）
  telemetry: 'crosschat.telemetry.v1',
  sites: 'crosschat.sites.v1',
  waitlist: 'crosschat.waitlist.v1',
};

/**
 * 每月每店默认 token 配额（约 2,000 次 5 轮会话，每次 7,250 token）。
 * 取值偏保守，叠加 routing.maxL2Share 的 L2 硬顶；后续可按真实用量画像调整。
 */
export const DEFAULT_MONTHLY_QUOTA_TOKENS = 15_000_000;

export const DEFAULT_CONFIG = {
  // demo = 无 Key 本地演示引擎；byok = 卖家自带火山方舟 Key
  mode: 'demo',
  ark: {
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: '',
    models: {
      // 翻译固定走 L1（见 分级规则：翻译永不上旗舰）
      // 2026-10-15 官方价目：L1 最便宜在售文本模型；L2 当前代旗舰
      l1: 'doubao-seed-2-0-mini-260428',
      l2: 'doubao-seed-2-1-pro-260915',
      // 备用供给（热切换，不做代码改动）：
      fallbackL1: 'doubao-seed-2-1-lite-260915', // 质量备选 L1（1M 上下文）
      fallbackL1Alt: 'deepseek-v4-1-flash-260910', // 空闲价 1/4、缓存 .02，高峰 2/8
      fallbackL2: 'deepseek-v4-pro-ga-260813', // 思考档备选，缓存命中仅 .30
    },
    timeoutMs: 20_000,
  },
  routing: {
    // 用量 ≥80% 后，仅凭强负面情绪不再升 L2，需命中明确纠纷词
    tightenAtUsageRatio: 0.8,
    // 每店每月 L2 会话硬顶：付费模型会话中 L2 占比到顶即强制 L1（成本护栏）
    maxL2Share: 0.2,
  },
  costControl: {
    // 内置成本控制手段
    prefixCacheEnabled: true,
    assumedCacheHitRate: 0.6, // 仅在服务端未返回 cached_tokens 时用于估算
    ragTopK: 3, // RAG 只注入 2–3 条
    historyRecentTurns: 5, // 最近 5 轮 + 摘要
    maxOutputTokens: 220, // 草稿 ≤ ~150 词
    batchReserved: true, // batch 半价接口占位（非实时任务，阶段2接入）
    monthlyQuotaTokens: DEFAULT_MONTHLY_QUOTA_TOKENS,
    overQuotaForceL1: true, // 超额强制 L1
  },
  pricing: {
    currency: 'CNY',
    // 2026-10-15 火山方舟官方文档价目（cn-beijing，元/百万 token，在线推理常规后付费）
    // https://docs.volcengine.com/docs/ark/model-pricing
    priceDate: '2026-10-15',
    region: 'cn-beijing',
    source: 'https://docs.volcengine.com/docs/ark/model-pricing',
    // 每百万 token 单价，与 ark.models.l1/l2 默认模型一一对应（cost-model.js 消费此形状）
    perMTokens: {
      l1: { input: 0.2, output: 2.0, cached: 0.04 }, // doubao-seed-2-0-mini-260428
      l2: { input: 6.0, output: 30.0, cached: 1.2 }, // doubao-seed-2-1-pro-260915
    },
    // 全候选价目（options 页模型下拉热切换用；batch 为非实时任务半价档）
    catalogue: [
      { id: 'doubao-seed-2-0-mini-260428', tier: 'L1', name: 'doubao-seed-2.0-mini',
        input: 0.2, output: 2.0, cached: 0.04, batch: { input: 0.1, output: 1.0, cached: 0.04 },
        context: '256k', cacheMinTokens: 1024, rpm: 30000, tpm: 5000000 },
      { id: 'doubao-seed-2-1-lite-260915', tier: 'L1', name: 'doubao-seed-2.1-lite',
        input: 0.8, output: 2.7, cached: 0.16, batch: { input: 0.4, output: 1.35, cached: 0.16 },
        context: '1024k', cacheMinTokens: 1024, rpm: 30000, tpm: 5000000 },
      { id: 'doubao-seed-2-0-lite-260428', tier: 'L1', name: 'doubao-seed-2.0-lite',
        input: 0.6, output: 3.6, cached: 0.12, batch: { input: 0.3, output: 1.8, cached: 0.12 },
        context: '256k', cacheMinTokens: 1024, rpm: 30000, tpm: 5000000 },
      { id: 'deepseek-v4-1-flash-260910', tier: 'L1', name: 'deepseek-v4.1-flash（空闲/高峰分时段）',
        input: 1.0, inputPeak: 2.0, output: 4.0, outputPeak: 8.0,
        cached: 0.02, cachedPeak: 0.04,
        context: '1024k', cacheMinTokens: 256, rpm: 500, tpm: 1000000,
        peakHoursCn: '周一至周五 09:00-12:00,14:00-18:00' },
      { id: 'deepseek-v4-flash-ga-260731', tier: 'L1', name: 'deepseek-v4-flash 正式版',
        input: 3.0, output: 9.0, cached: 0.1, batch: { input: 1.5, output: 4.5, cached: 0.1 },
        context: '1024k', cacheMinTokens: 2048, rpm: 500, tpm: 1000000 },
      { id: 'glm-5-3-flash-260828', tier: 'L1', name: 'glm-5.3-flash',
        input: 0.8, output: 2.8, cached: 0.23,
        context: '1024k', cacheMinTokens: 8960, rpm: 500, tpm: 1000000 },
      { id: 'doubao-seed-2-1-pro-260915', tier: 'L2', name: 'doubao-seed-2.1-pro',
        input: 6.0, output: 30.0, cached: 1.2, batch: { input: 3.0, output: 15.0, cached: 1.2 },
        context: '1024k', cacheMinTokens: 1024, rpm: 500, tpm: 1000000 },
      { id: 'deepseek-v4-pro-ga-260813', tier: 'L2', name: 'deepseek-v4-pro 正式版',
        input: 9.0, output: 27.0, cached: 0.3, batch: { input: 4.5, output: 13.5, cached: 0.3 },
        context: '1024k', cacheMinTokens: 2048, rpm: 500, tpm: 1000000, thinkingByDefault: true },
      { id: 'doubao-seed-2-0-pro-260215', tier: 'L2', name: 'doubao-seed-2.0-pro（即将下线，仅过渡）',
        input: 3.2, output: 16.0, cached: 0.64, batch: { input: 1.6, output: 8.0, cached: 0.64 },
        context: '256k', cacheMinTokens: 1024, rpm: 30000, tpm: 5000000, retiring: true },
    ],
    // 典型用量模型（估算值，待真实店铺日志校准）
    usageProfile: {
      turnsPerConversation: 5,
      inputTokensPerTurn: 1200,
      outputTokensPerTurn: 250,
    },
  },
  stores: [
    { id: 'store-default', name: '默认店铺', platform: 'generic' },
  ],
  // storeId -> 知识库条目数组；'default' 兜底
  knowledgeBases: {
    default: DEFAULT_KNOWLEDGE_PLACEHOLDER(),
  },
};

function DEFAULT_KNOWLEDGE_PLACEHOLDER() {
  // 与 src/data/knowledge-base.json 同源；安装时由 service worker 用 JSON 文件播种，
  // 这里的兜底保证 node / 存储损坏时仍有可用 FAQ。
  return [
    {
      id: 'shipping-time',
      intent: 'logistics',
      tags: ['shipping'],
      keywords: ['shipping time', 'how long', 'delivery', 'arrive', 'when', '物流', '多久', '到货', '几天'],
      questions: ['how long does shipping take', 'when will my order arrive', '物流多久到货'],
      answer:
        'Standard delivery takes 7–15 business days. You will receive a tracking number once the order ships.',
    },
    {
      id: 'tracking',
      intent: 'logistics',
      tags: ['tracking'],
      keywords: ['track', 'tracking number', 'where is my order', '快递', '单号', '物流查询', '没收到'],
      questions: ['where is my order', 'can i track my package', '怎么查快递单号'],
      answer:
        'Your parcel is in transit. Please find the tracking number in your order details; updates may take 24–48 hours to appear.',
    },
    {
      id: 'sizing',
      intent: 'sizing',
      tags: ['size'],
      keywords: ['size', 'fit', 'small', 'large', '尺码', '大小', '偏大', '偏小'],
      questions: ['does it run true to size', 'how does the sizing fit', '尺码准吗'],
      answer:
        'The item fits true to size. Please refer to the size chart in the product images; between sizes we recommend the larger one.',
    },
    {
      id: 'return-policy',
      intent: 'after_sales',
      tags: ['return', 'refund'],
      keywords: ['return', 'refund', 'exchange', '退货', '退款', '退换', '售后'],
      questions: ['what is your return policy', 'can i return this', '可以退货吗'],
      answer:
        'Returns are accepted within 15 days of delivery for items in original condition. Please open a return request through the platform and we will approve it promptly.',
    },
  ];
}

/** 简单深合并：仅用于「用户配置覆盖默认配置」，数组整体替换 */
export function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return structuredCloneSafe(base);
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v && typeof v === 'object' && !Array.isArray(v)
      && base && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      out[k] = deepMerge(base[k], v);
    } else if (v !== undefined) {
      out[k] = structuredCloneSafe(v);
    }
  }
  return out;
}

function structuredCloneSafe(v) {
  if (v === undefined) return v;
  return JSON.parse(JSON.stringify(v));
}
