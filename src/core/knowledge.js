/**
 * 本地知识库检索（plan 交付项 5）：商品 FAQ JSON（尺码表/物流时效/售后政策…），
 * 纯本地 Top-K 检索，只注入 2–3 条。零依赖、零网络。
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'do', 'does', 'did', 'i', 'me',
  'my', 'we', 'you', 'your', 'it', 'its', 'this', 'that', 'to', 'of', 'in', 'on',
  'for', 'and', 'or', 'with', 'how', 'what', 'when', 'where', 'can', 'could',
  'would', 'should', 'please', 'about', 'be', 'will', 'my', 'mine', 'have', 'has',
  '吗', '呢', '的话', '请问', '一下', '怎么', '如何', '多少', '为什么',
]);

/** 兼容中英文的 token 化：拉丁词 + 中文二元组 */
export function tokenize(text) {
  const normalized = String(text ?? '').toLowerCase();
  const tokens = [];
  const latin = normalized.match(/[a-z0-9]+('[a-z]+)?/g) || [];
  for (const w of latin) {
    if (!STOPWORDS.has(w) && w.length > 1) tokens.push(w);
  }
  const cjkRuns = normalized.match(/[一-龥]+/g) || [];
  for (const run of cjkRuns) {
    for (let i = 0; i < run.length - 1; i++) {
      const bi = run.slice(i, i + 2);
      if (!STOPWORDS.has(bi)) tokens.push(bi);
    }
    if (run.length === 1) tokens.push(run);
  }
  return tokens;
}

function scoreEntry(entry, queryTokens, intent) {
  let score = 0;
  const qSet = new Set(queryTokens);

  for (const kw of entry.keywords || []) {
    const kwLower = String(kw).toLowerCase();
    if (queryTokens.some((t) => kwLower.includes(t) || t.includes(kwLower))) score += 1.5;
    // 整词出现在原查询里（英文短语 / 中文关键词）
    if (intentQueryContains(queryTokens, kwLower)) score += 0.5;
  }
  for (const q of entry.questions || []) {
    const qTokens = tokenize(q);
    if (!qTokens.length) continue;
    let overlap = 0;
    for (const t of qTokens) if (qSet.has(t)) overlap++;
    score += 2 * (overlap / qTokens.length);
  }
  if (intent && entry.intent === intent) score += 1;
  for (const tag of entry.tags || []) {
    if (qSet.has(String(tag).toLowerCase())) score += 0.5;
  }
  return score;
}

function intentQueryContains(queryTokens, kwLower) {
  // 英文关键词按空格分词时，要求所有词都在查询 token 中
  if (/^[a-z0-9 '.-]+$/.test(kwLower)) {
    const parts = kwLower.split(/\s+/).filter(Boolean);
    return parts.every((p) => queryTokens.includes(p) || queryTokens.some((t) => t.includes(p)));
  }
  // 中文关键词：查询二元组中出现
  return queryTokens.some((t) => t.includes(kwLower) || kwLower.includes(t));
}

/**
 * 检索 Top-K。返回按分数降序的命中（含 score），无命中返回空数组。
 */
export function search(entries, query, { intent = '', topK = 3 } = {}) {
  const qTokens = tokenize(query);
  if (!qTokens.length) return [];
  return (entries || [])
    .map((entry) => ({ entry, score: scoreEntry(entry, qTokens, intent) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * L0 强命中判定：分数达到阈值且覆盖了查询中足够比例的内容词。
 * 默认阈值按现有关键词权重标定（多关键词 / 问题高重合才走 L0，避免零 Token 误答）。
 */
export function matchFaq(entries, query, { intent = '', threshold = 3, minCoverage = 0.5 } = {}) {
  const hits = search(entries, query, { intent, topK: 1 });
  if (!hits.length) return null;
  const top = hits[0];
  const qTokens = new Set(tokenize(query));
  const matched = new Set();
  for (const kw of top.entry.keywords || []) {
    for (const t of qTokens) {
      if (String(kw).toLowerCase().includes(t) || t.includes(String(kw).toLowerCase())) matched.add(t);
    }
  }
  for (const q of top.entry.questions || []) {
    for (const t of tokenize(q)) if (qTokens.has(t)) matched.add(t);
  }
  const coverage = qTokens.size ? matched.size / qTokens.size : 0;
  if (top.score >= threshold && coverage >= minCoverage) return top;
  return null;
}

/** 用订单/商品卡变量渲染答案，缺失变量保留原样由人工补 */
export function renderAnswer(answer, vars = {}) {
  return String(answer).replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? vars[key] : `{${key}}`);
}
