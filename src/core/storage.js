/**
 * 本地存储封装：浏览器走 chrome.storage.local（数据不出本机），node 测试走内存。
 * 不使用 IndexedDB（阶段1 仅配置/计量事件，local 容量足够）。
 */
import { DEFAULT_CONFIG, STORAGE_KEYS, deepMerge } from './defaults.js';

const memoryStore = new Map();

function hasChromeStorage() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}

export const localStore = {
  async get(key, fallback = null) {
    if (hasChromeStorage()) {
      const obj = await chrome.storage.local.get(key);
      return obj[key] ?? fallback;
    }
    return memoryStore.has(key) ? memoryStore.get(key) : fallback;
  },
  async set(key, value) {
    if (hasChromeStorage()) {
      await chrome.storage.local.set({ [key]: value });
    } else {
      memoryStore.set(key, value);
    }
  },
  async remove(key) {
    if (hasChromeStorage()) {
      await chrome.storage.local.remove(key);
    } else {
      memoryStore.delete(key);
    }
  },
  /** 仅供测试重置 */
  _reset() {
    memoryStore.clear();
  },
};

export async function getConfig() {
  const saved = await localStore.get(STORAGE_KEYS.config, {});
  return deepMerge(DEFAULT_CONFIG, saved || {});
}

export async function saveConfig(patch) {
  const current = await localStore.get(STORAGE_KEYS.config, {});
  const merged = deepMerge(current || {}, patch);
  await localStore.set(STORAGE_KEYS.config, merged);
  return getConfig();
}

export async function getMeterEvents() {
  return (await localStore.get(STORAGE_KEYS.events, [])) || [];
}

/** 计量事件环形裁剪，默认最多保留 20,000 条（本地看板窗口足够） */
export async function appendMeterEvent(event, maxEvents = 20_000) {
  const events = await getMeterEvents();
  events.push(event);
  if (events.length > maxEvents) events.splice(0, events.length - maxEvents);
  await localStore.set(STORAGE_KEYS.events, events);
  return events;
}
