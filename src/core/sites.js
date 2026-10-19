/**
 * 用户自选客服站点与 MV3 动态内容脚本注册（v1.0.0 隐私设计 权限收敛）。
 *
 * 过审关键：扩展不再在 manifest 静态声明全站 content_scripts；
 * 只有用户在 UI 里显式添加站点（chrome.permissions.request 用户手势授权）后，
 * 才用 chrome.scripting.registerContentScripts 向该 origin 注入预打包的经典脚本
 * content.bundle.js（scripts/bundle-content.mjs 生成，零依赖、无需 WAR）；
 * 移除站点立即 unregister，并可选 revoke origin 权限。
 *
 * 本模块纯逻辑部分（patterns 校验、描述符构造、存储增删）可在 node 单测。
 */
import { localStore } from './storage.js';
import { STORAGE_KEYS } from './defaults.js';

export const CONTENT_SCRIPT_ID = 'crosschat-user-sites';
/** 由 scripts/bundle-content.mjs 生成；改动 content-main/pii/adapters 后须 npm run build */
export const CONTENT_BUNDLE_PATH = 'src/content/content.bundle.js';

/**
 * 预置站点。match pattern 必须是 Chrome 合法形态
 * （scheme :// *.host / path；不支持 *.tld，所以 Shopee 各国家站显式列出）。
 */
export const SITE_PRESETS = [
  {
    id: 'tiktok_shop',
    name: 'TikTok Shop 卖家中心',
    patterns: ['https://*.tiktok.com/*'],
  },
  {
    id: 'shopee',
    name: 'Shopee 卖家中心（各国家站）',
    patterns: [
      'https://*.shopee.com/*',
      'https://*.shopee.cn/*',
      'https://*.shopee.com.my/*',
      'https://*.shopee.sg/*',
      'https://*.shopee.co.th/*',
      'https://*.shopee.co.id/*',
      'https://*.shopee.ph/*',
      'https://*.shopee.vn/*',
      'https://*.shopee.com.tw/*',
      'https://*.shopee.com.br/*',
      'https://*.shopee.com.mx/*',
      'https://*.shp.ee/*',
    ],
  },
  {
    id: 'amazon_seller',
    name: 'Amazon Seller Central',
    patterns: [
      'https://sellercentral.amazon.com/*',
      'https://sellercentral.amazon.co.uk/*',
      'https://sellercentral.amazon.de/*',
      'https://sellercentral.amazon.co.jp/*',
    ],
  },
  {
    id: 'gmail',
    name: 'Gmail 网页版',
    patterns: ['https://mail.google.com/*'],
  },
];

/** Chrome match pattern（仅 http/https），path 统一要求 /* */
const PATTERN_RE = /^https?:\/\/(?:\*\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*(?::\d+)?\/\*$/;

export function isValidPattern(p) {
  if (typeof p !== 'string' || p.length > 256) return false;
  if (!PATTERN_RE.test(p)) return false;
  const host = p.split('/')[2].replace(/^\*\./, '').replace(/:\d+$/, '');
  if (!host.includes('.') && host !== 'localhost') return false;
  return true;
}

/** 把用户输入的 origin/URL 归一化为 match pattern；非法返回 null */
export function normalizePattern(input) {
  if (typeof input !== 'string') return null;
  let u;
  try {
    u = new URL(input.includes('://') ? input : `https://${input}`);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const p = `${u.protocol}//${u.host}/*`;
  return isValidPattern(p) ? p : null;
}

export function presetById(id) {
  return SITE_PRESETS.find((s) => s.id === id) || null;
}

/** patterns -> registerContentScripts 描述符；空数组表示应注销 */
export function buildRegisteredScripts(patterns) {
  const matches = [...new Set(patterns)].filter(isValidPattern);
  if (!matches.length) return [];
  return [{
    id: CONTENT_SCRIPT_ID,
    matches,
    js: [CONTENT_BUNDLE_PATH],
    runAt: 'document_idle',
    // Shopee/TikTok 聊天窗可能在同源 iframe 内；每帧独立 bootstrap（HOST_ID 去重）
    allFrames: true,
  }];
}

/**
 * 与浏览器实际注册状态对齐：有 patterns 则 register（同名 id 自动覆盖），
 * 为空则 unregister。注入 chrome.scripting API，便于测试打桩。
 */
export async function reconcileContentScripts(patterns, scriptingApi) {
  const scripts = buildRegisteredScripts(patterns);
  if (!scriptingApi) throw new Error('chrome.scripting unavailable');
  if (!scripts.length) {
    try {
      await scriptingApi.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
    } catch (e) {
      // 本就未注册时 Chrome 报找不到 id，视为已对齐
      if (!/not find|not registered|no content script/i.test(String(e?.message))) throw e;
    }
    return [];
  }
  await scriptingApi.registerContentScripts(scripts);
  return scripts[0].matches;
}

export async function getEnabledPatterns(store = localStore) {
  const v = await store.get(STORAGE_KEYS.sites, []);
  return Array.isArray(v) ? v.filter(isValidPattern) : [];
}

export async function addPatterns(patterns, store = localStore) {
  const cur = new Set(await getEnabledPatterns(store));
  for (const p of patterns) {
    if (isValidPattern(p)) cur.add(p);
  }
  const next = [...cur];
  await store.set(STORAGE_KEYS.sites, next);
  return next;
}

export async function removePattern(pattern, store = localStore) {
  const next = (await getEnabledPatterns(store)).filter((p) => p !== pattern);
  await store.set(STORAGE_KEYS.sites, next);
  return next;
}
