/**
 * 平台适配层（plan 交付项 8）：统一接口 capture()/fillDraft()，
 * Shopee / TikTok Shop 为选择器脚手架（真实选择器待 C1 首发平台确认后校准），
 * generic 手动捕获兜底适用于任意站点。
 *
 * 硬边界：只填发送框，绝不调用 .click() 发送、不做批量自动化。
 */

/**
 * TODO(C1): 下列选择器均为脚手架占位，首发平台确认 + 真实 DOM 勘察后校准。
 * 校准方式：在目标站点聊天页用 DevTools 记录消息气泡与输入框的稳定选择器。
 */
export const ADAPTERS = [
  {
    id: 'shopee',
    name: 'Shopee Seller Chat（脚手架）',
    match: (loc) => /(^|\.)shopee\.[a-z.]+$/.test(loc.hostname) || loc.hostname.includes('shopee'),
    selectors: {
      // TODO(C1): 校准真实稳定选择器
      messageItems: ['.chat-message__content', '[class*="message-item"] [class*="text"]', '.conversation-message'],
      draftBox: ['textarea.chat-input', '[class*="chat-input"] textarea', '[contenteditable="true"]'],
    },
  },
  {
    id: 'tiktok_shop',
    name: 'TikTok Shop IM（脚手架）',
    match: (loc) => loc.hostname.includes('tiktok'),
    selectors: {
      // TODO(C1): 校准真实稳定选择器
      messageItems: ['[data-e2e="im-message-content"]', '[class*="messageContent"]', '.im-message-text'],
      draftBox: ['[data-e2e="im-input"] textarea', '[contenteditable="true"]', 'textarea[class*="input"]'],
    },
  },
  {
    id: 'generic',
    name: '通用手动捕获兜底',
    match: () => true,
    selectors: { messageItems: [], draftBox: [] },
  },
];

export function pickAdapter(locationLike = window.location) {
  return ADAPTERS.find((a) => {
    try {
      return a.match(locationLike);
    } catch {
      return false;
    }
  }) || ADAPTERS[ADAPTERS.length - 1];
}

function visible(el) {
  if (!el || !el.getClientRects) return false;
  const rects = el.getClientRects();
  if (!rects.length) return false;
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none' && rects[0].width > 20;
}

/** 取页面上「最像聊天输入框」的元素：优先活动元素，其次面积最大的可编辑区 */
export function findDraftBox(adapter = pickAdapter()) {
  const candidates = [];
  for (const sel of adapter.selectors.draftBox || []) {
    for (const el of document.querySelectorAll(sel)) {
      if (visible(el)) candidates.push(el);
    }
  }
  document.querySelectorAll('textarea, [contenteditable=""], [contenteditable="true"]').forEach((el) => {
    if (visible(el)) candidates.push(el);
  });
  if (document.activeElement && candidates.includes(document.activeElement)) return document.activeElement;
  candidates.sort((a, b) => boxArea(b) - boxArea(a));
  return candidates[0] || null;
}

function boxArea(el) {
  const r = el.getBoundingClientRect();
  return r.width * r.height;
}

/** React/Vue 受控组件兼容的赋值方式 */
function nativeInputSet(el, value) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function setContentEditable(el, value) {
  el.focus();
  // 优先 execCommand（React 16 监听 beforeinput/input 时最兼容）
  let ok = false;
  try {
    ok = document.execCommand('selectAll', false, null);
    ok = document.execCommand('insertText', false, value) || ok;
  } catch {
    ok = false;
  }
  if (!ok) {
    el.textContent = value;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
  }
}

/**
 * 把草稿填入平台发送框（只填不发）。返回 {ok, target}。
 */
export function fillDraft(text, { restore } = {}) {
  const adapter = pickAdapter();
  const box = findDraftBox(adapter);
  if (!box) return { ok: false, reason: 'no_draft_box', adapter: adapter.id };
  const finalText = typeof restore === 'function' ? restore(text) : text;
  box.focus();
  if (box.isContentEditable) {
    setContentEditable(box, finalText);
  } else {
    nativeInputSet(box, finalText);
  }
  box.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  return { ok: true, adapter: adapter.id, targetDesc: describeTarget(box) };
}

function describeTarget(el) {
  return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.split(/\s+/).slice(0, 2).join('.')}` : ''}`;
}

/**
 * 抓取当前会话文本：平台适配器命中时取消息气泡，否则返回用户在页面上的选区文本。
 */
export function captureSelection() {
  const sel = window.getSelection?.().toString().trim() || '';
  return sel;
}

export function captureConversation() {
  const adapter = pickAdapter();
  const texts = [];
  for (const sel of adapter.selectors.messageItems || []) {
    document.querySelectorAll(sel).forEach((el) => {
      const t = el.innerText?.trim();
      if (t) texts.push(t);
    });
    if (texts.length) break;
  }
  return { adapter: adapter.id, messages: texts };
}
