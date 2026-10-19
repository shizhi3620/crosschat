/**
 * 页面浮动部件：手动捕获买家消息 → 后台分级处理 → 展示翻译/草稿与合规结果
 * → 人工点「采纳并填入发送框」。任何情况下都不自动发送。
 * 真实站点注入使用打包后的经典脚本 src/content/content.bundle.js
 * （scripts/bundle-content.mjs 生成，无需 web_accessible_resources）；
 * 扩展内 demo 页直接以 ESM module 引入本文件。
 */
import { restoreDraft } from '../core/pii.js';
import { fillDraft, captureSelection, captureConversation, pickAdapter } from './adapters.js';

const HOST_ID = '__crosschat_widget_host__';

export function bootstrap() {
  if (document.getElementById(HOST_ID)) return;
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'all: initial; position: fixed; z-index: 2147483647;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${STYLE}</style>${HTML}`;
  document.documentElement.appendChild(host);
  new Widget(shadow);
}

const STYLE = `
:host, * { all: unset; box-sizing: border-box; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; }
/* 上面的 * 通配 all:unset 会抹掉 UA 对 <style> 的 display:none，必须在 shadow 内显式恢复 */
style { display: none; }
#fab { position: fixed; right: 16px; bottom: 16px; width: 44px; height: 44px; border-radius: 22px;
  background: #1f6feb; color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 12px; font-weight: 600; box-shadow: 0 4px 14px rgba(0,0,0,.25); }
#fab:hover { background: #1858c0; }
#panel { position: fixed; right: 16px; bottom: 70px; width: 380px; max-height: 72vh; overflow: auto;
  background: #fff; color: #1f2328; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,.22);
  display: none; flex-direction: column; border: 1px solid #d0d7de; }
#panel.open { display: flex; }
.hd { padding: 10px 12px; background: #f6f8fa; border-bottom: 1px solid #d0d7de; display: flex;
  align-items: center; gap: 8px; font-weight: 600; font-size: 13px; }
.hd .spacer { flex: 1; }
.hd .x { cursor: pointer; color: #57606a; padding: 0 4px; }
.bd { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; font-size: 12px; }
textarea { width: 100%; border: 1px solid #d0d7de; border-radius: 6px; padding: 8px; font-size: 12px;
  font-family: inherit; resize: vertical; min-height: 64px; color: #1f2328; background: #fff; }
textarea:focus { outline: 2px solid #1f6feb33; border-color: #1f6feb; }
.row { display: flex; gap: 6px; flex-wrap: wrap; }
button { cursor: pointer; border-radius: 6px; padding: 6px 10px; font-size: 12px; border: 1px solid #d0d7de;
  background: #f6f8fa; color: #1f2328; }
button.primary { background: #1f6feb; border-color: #1f6feb; color: #fff; }
button.primary:disabled { background: #94b8f5; border-color: #94b8f5; cursor: not-allowed; }
button.danger:disabled { background: #ccc; border-color: #ccc; cursor: not-allowed; }
.badge { display: inline-block; border-radius: 10px; padding: 1px 8px; font-size: 11px; font-weight: 600; }
.badge.L0 { background: #dafbe1; color: #116329; }
.badge.L1 { background: #ddf4ff; color: #0969da; }
.badge.L2 { background: #fff1e5; color: #bc4c00; }
.badge.demo { background: #fff8c5; color: #7d4e00; }
.badge.byok { background: #dafbe1; color: #116329; }
.meta { color: #57606a; }
.finding { border-radius: 6px; padding: 6px 8px; font-size: 11px; line-height: 1.5; }
.finding.block { background: #ffebe9; border: 1px solid #ffabab; color: #82071e; }
.finding.warn { background: #fff8c5; border: 1px solid #eac54f; color: #7d4e00; }
.refs { color: #57606a; font-size: 11px; }
.note { font-size: 11px; color: #57606a; }
.ok { color: #116329; }
.err { color: #82071e; }
.hidden { display: none; }
/* 演示/失败占位文本：红底明示「切勿外发」，并禁止采纳（P1-5） */
textarea.placeholder-output { background: #ffebe9; border-color: #ffabab; color: #82071e; }
.placeholder-warn { border-radius: 6px; padding: 6px 8px; font-size: 11px; line-height: 1.5;
  background: #ffebe9; border: 1px solid #ffabab; color: #82071e; font-weight: 600; }
`;

const HTML = `
<div id="fab" title="打开跨海聊 CrossChat">跨海聊</div>
<div id="panel">
  <div class="hd">
    跨海聊 CrossChat
    <span id="modeBadge" class="badge demo">演示</span>
    <span class="spacer"></span>
    <span class="x" id="close">×</span>
  </div>
  <div class="bd">
    <div class="note" id="adapterLine"></div>
    <textarea id="input" placeholder="选中页面里的买家消息后点「捕获选中」，或直接粘贴 / 输入买家消息…"></textarea>
    <div class="row">
      <button id="capture">捕获选中文字</button>
      <button id="translate" class="primary">翻译</button>
      <button id="draft" class="primary">草拟回复</button>
    </div>
    <div id="status" class="note"></div>
    <div id="result" class="hidden">
      <div class="row" style="align-items:center">
        <span id="levelBadge" class="badge L1">L1</span>
        <span id="intent" class="meta"></span>
        <span id="model" class="meta"></span>
      </div>
      <div id="findings"></div>
      <textarea id="output" rows="6"></textarea>
      <div id="refs" class="refs"></div>
      <div id="piiNote" class="note"></div>
      <div id="placeholderNote" class="placeholder-warn hidden"></div>
      <div class="row">
        <button id="adopt" class="primary">采纳并填入发送框</button>
        <button id="copy">复制文案</button>
      </div>
      <div id="adoptNote" class="note"></div>
    </div>
  </div>
</div>`;

class Widget {
  constructor(root) {
    this.root = root;
    this.$ = (sel) => root.querySelector(sel);
    this.lastResult = null;
    this.$('#fab').addEventListener('click', () => this.toggle());
    this.$('#close').addEventListener('click', () => this.$('#panel').classList.remove('open'));
    this.$('#capture').addEventListener('click', () => this.onCapture());
    this.$('#translate').addEventListener('click', () => this.onProcess('translate'));
    this.$('#draft').addEventListener('click', () => this.onProcess('draft'));
    this.$('#adopt').addEventListener('click', () => this.onAdopt());
    this.$('#copy').addEventListener('click', () => this.onCopy());
    const adapter = pickAdapter();
    this.$('#adapterLine').textContent = `适配器：${adapter.name}（只填发送框，人工点击平台发送）`;
    chrome.runtime.sendMessage({ type: 'crosschat:ping' })
      .catch(() => this.setStatus('后台未就绪，请重新加载扩展', 'err'));
  }

  toggle() {
    this.$('#panel').classList.toggle('open');
  }

  onCapture() {
    const text = captureSelection();
    if (!text) {
      const conv = captureConversation();
      if (conv.messages.length) {
        this.$('#input').value = conv.messages.slice(-3).join('\n---\n');
        this.setStatus(`已从适配器 ${conv.adapter} 捕获最近消息（未命中真实选择器时请改用手动选中文字）。`);
      } else {
        this.setStatus('未捕获到文字：请先用鼠标选中买家消息，再点捕获（通用手动兜底）。', 'err');
      }
      return;
    }
    this.$('#input').value = text;
    this.setStatus(`已捕获 ${text.length} 字。`);
  }

  async onProcess(task) {
    const text = this.$('#input').value.trim();
    if (!text) {
      this.setStatus('请先捕获或输入买家消息。', 'err');
      return;
    }
    this.setStatus('处理中…');
    let resp;
    try {
      resp = await chrome.runtime.sendMessage({
        type: 'crosschat:process',
        task,
        // 仅传 hostname 供遥测做平台粗分类；绝不传完整 URL/标题/正文外的页面信息
        host: location.hostname,
        message: { text, receivedAt: Date.now() },
      });
    } catch (e) {
      this.setStatus(`调用失败：${e?.message || e}`, 'err');
      return;
    }
    if (!resp?.ok) {
      this.setStatus(`处理失败：${resp?.error || '未知错误'}`, 'err');
      return;
    }
    this.renderResult(resp.data, task);
  }

  renderResult(r, task) {
    this.lastResult = r;
    this.$('#result').classList.remove('hidden');
    this.$('#modeBadge').className = `badge ${r.demo ? 'demo' : 'byok'}`;
    this.$('#modeBadge').textContent = r.demo ? '演示模式' : 'BYOK';
    this.$('#levelBadge').className = `badge ${r.level}`;
    this.$('#levelBadge').textContent = r.level;
    this.$('#intent').textContent = r.intent ? `意图：${r.intent}` : '';
    this.$('#model').textContent = r.model ? `模型：${r.model}` : '';
    this.$('#output').value = r.draft || '';
    this.$('#refs').textContent = r.references?.length ? `引用：${r.references.map((x) => `[KB:${x}]`).join(' ')}` : '';

    // P1-5：演示占位 / 接口失败均不得进入发送框。L0 知识库模板（placeholder=false）照常可采纳。
    const outputEl = this.$('#output');
    const noteEl = this.$('#placeholderNote');
    let placeholderMsg = '';
    if (r.error) {
      placeholderMsg = '生成失败，未产生可用文案。请检查 API Key / 网络后重试——不要把空结果或报错内容外发给买家。';
    } else if (r.placeholder) {
      placeholderMsg = location.protocol === 'chrome-extension:'
        ? '这是演示模式的占位内容，只用于体验界面，不是真实 AI 输出，不可填入发送框。'
        : '演示模式占位内容：未配置 Ark Key 前不可填入发送框，也切勿直接外发给买家。请先到设置页配置 BYOK。';
    }
    this.placeholderBlocked = Boolean(placeholderMsg);
    noteEl.textContent = placeholderMsg;
    noteEl.classList.toggle('hidden', !placeholderMsg);
    outputEl.classList.toggle('placeholder-output', this.placeholderBlocked && Boolean(outputEl.value));

    const findingsEl = this.$('#findings');
    findingsEl.innerHTML = '';
    for (const f of r.compliance?.findings || []) {
      const div = document.createElement('div');
      div.className = `finding ${f.severity}`;
      div.textContent = `${f.severity === 'block' ? '⛔' : '⚠️'} ${f.ruleId}：${f.message}`;
      findingsEl.appendChild(div);
    }

    const adoptBtn = this.$('#adopt');
    adoptBtn.classList.remove('danger');
    if (r.blocked) {
      adoptBtn.disabled = true;
      adoptBtn.textContent = '合规拦截：请修改后重拟';
      adoptBtn.classList.add('danger');
      adoptBtn.title = '命中平台合规阻断规则，修改文案后重新草拟再采纳';
    } else if (this.placeholderBlocked) {
      adoptBtn.disabled = true;
      adoptBtn.textContent = r.error ? '生成失败：无可采纳文案' : '占位内容不可采纳';
      adoptBtn.title = r.error
        ? '接口报错时没有可填入的文案，请修复后重试'
        : '演示占位内容不是真实回复，配置 Ark Key 后才能填入发送框';
    } else {
      adoptBtn.disabled = false;
      adoptBtn.textContent = '采纳并填入发送框';
      adoptBtn.title = '';
    }

    const entCount = r.entities?.length || 0;
    this.$('#piiNote').textContent = entCount
      ? `PII：入模前已脱敏 ${entCount} 处（${[...new Set(r.entities.map((e) => e.type))].join('/')}），采纳填入时自动还原。`
      : 'PII：未发现需要脱敏的信息。';

    const q = r.quota;
    const quotaNote = q
      ? `｜本月配额用量 ${(q.ratio * 100).toFixed(1)}%（${q.phase === 'normal' ? '正常' : q.phase === 'tighten' ? '收紧 L2' : '超额强制 L1'}）`
      : '';
    // 触发 cap 效果的原因可能是 token 超额，也可能是 L2 占比硬顶——两者都显示
    const l2Note = r.l2Share?.capped
      ? `｜L2 会话占比 ${(r.l2Share.share * 100).toFixed(0)}% 已达硬顶，强制 L1`
      : '';
    this.setStatus(
      `完成：${r.level}｜${r.reasons.join(', ')}｜缓存${r.usage?.cacheHit ? '命中' : '未命中'}${quotaNote}${l2Note}`
      + (r.error ? `｜Ark 错误：${r.error}（已展示空草稿，请检查 Key/网络）` : ''),
      r.error ? 'err' : '',
    );
    if (task === 'translate' && r.translated) {
      this.$('#output').value = r.translated;
    }
  }

  async onAdopt() {
    const r = this.lastResult;
    // 双保险：即使按钮状态被改动，合规拦截 / 占位内容也不进入发送框（P1-5）
    if (!r || r.blocked || r.error || r.placeholder) return;
    const edited = this.$('#output').value;
    const restored = restoreDraft(edited, r.entities || []);
    const out = fillDraft(restored, {});
    const note = this.$('#adoptNote');
    if (!out.ok) {
      note.className = 'note err';
      note.textContent = '未在页面找到发送框：请先把光标点进平台聊天输入框，再试一次；或用「复制文案」手动粘贴。';
      return;
    }
    note.className = 'note ok';
    note.textContent = `已填入 ${out.targetDesc}（适配器 ${out.adapter}）。请人工核对后亲自点击平台发送——扩展不会代发。`;
    try {
      await chrome.runtime.sendMessage({
        type: 'crosschat:adopt',
        conversationId: r.conversationId,
        storeId: r.storeId,
        level: r.level,
        host: location.hostname,
      });
    } catch {
      /* 采纳计量失败不影响填入结果 */
    }
  }

  async onCopy() {
    const text = this.$('#output').value;
    try {
      await navigator.clipboard.writeText(text);
      this.$('#adoptNote').className = 'note ok';
      this.$('#adoptNote').textContent = '已复制到剪贴板。';
    } catch {
      this.$('#adoptNote').className = 'note err';
      this.$('#adoptNote').textContent = '复制失败，请手动选择文本复制。';
    }
  }

  setStatus(text, cls = '') {
    const el = this.$('#status');
    el.className = `note ${cls}`;
    el.textContent = text;
  }
}

/** demo 页按钮用：直接把模拟买家消息灌进输入框 */
window.__crosschat = {
  setInput(text) {
    const ta = document.querySelector(`#${HOST_ID}`)?.shadowRoot?.querySelector('#input');
    if (ta) {
      ta.value = text;
      const panel = document.getElementById(HOST_ID)?.shadowRoot?.querySelector('#panel');
      panel?.classList.add('open');
    }
  },
};
