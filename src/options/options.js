import { getConfig, saveConfig } from '../core/storage.js';
import { telemetry } from '../core/telemetry.js';
import { normalizePattern } from '../core/sites.js';

const $ = (s) => document.querySelector(s);

function bg(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      resp?.ok ? resolve(resp.data) : reject(new Error(resp?.error || 'Unknown error'));
    });
  });
}
const status = (text, cls = 'muted') => {
  const el = $('#saveStatus');
  el.className = cls;
  el.textContent = text;
};

function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    cur[keys[i]] ??= {};
    cur = cur[keys[i]];
  }
  cur[keys.at(-1)] = value;
}

function getPath(obj, path) {
  return path.split('.').reduce((cur, k) => (cur == null ? undefined : cur[k]), obj);
}

async function load() {
  const config = await getConfig();
  $('#ver').textContent = `v${chrome.runtime.getManifest().version}｜当前：${config.mode === 'byok' ? 'BYOK' : '演示模式'}`;

  document.querySelectorAll('input[name="mode"]').forEach((r) => {
    r.checked = r.value === config.mode;
  });
  document.querySelectorAll('input[data-k]').forEach((input) => {
    const v = getPath(config, input.dataset.k);
    if (input.type === 'checkbox') input.checked = !!v;
    else if (v != null) input.value = v;
  });

  const priceMeta = [];
  if (config.pricing?.priceDate) priceMeta.push(`现价核验日期：${config.pricing.priceDate}`);
  if (config.pricing?.source) priceMeta.push(`来源：${config.pricing.source}`);
  $('#priceMeta').textContent = priceMeta.join('｜') || '单价为内置估算值，实际费用以模型服务商官方价目为准。';

  $('#storesJson').value = JSON.stringify(config.stores, null, 2);
  $('#kbJson').value = JSON.stringify(config.knowledgeBases?.default || [], null, 2);
}

async function onSave() {
  const patch = {};
  document.querySelectorAll('input[data-k]').forEach((input) => {
    let v;
    if (input.type === 'checkbox') v = input.checked;
    else if (input.type === 'number') v = input.value === '' ? null : Number(input.value);
    else v = input.value;
    setPath(patch, input.dataset.k, v);
  });
  patch.mode = document.querySelector('input[name="mode"]:checked')?.value || 'demo';

  let stores;
  try {
    stores = JSON.parse($('#storesJson').value);
    if (!Array.isArray(stores) || !stores.every((s) => s.id && s.name)) throw new Error('店铺需为含 id/name 的数组');
  } catch (e) {
    status(`店铺 JSON 无效：${e.message}`, 'err');
    return;
  }
  patch.stores = stores;

  let kb;
  try {
    kb = JSON.parse($('#kbJson').value);
    if (!Array.isArray(kb)) throw new Error('知识库必须是条目数组');
    for (const e of kb) {
      if (!e.id || !e.answer) throw new Error(`条目缺少 id/answer：${JSON.stringify(e).slice(0, 60)}`);
    }
  } catch (e) {
    status(`知识库 JSON 无效：${e.message}`, 'err');
    return;
  }
  patch.knowledgeBases = { default: kb };

  await saveConfig(patch);
  status('已保存到本机 chrome.storage.local。', 'ok');
}

$('#save').addEventListener('click', () => onSave().catch((e) => status(`保存失败：${e.message}`, 'err')));

$('#resetKb').addEventListener('click', async () => {
  const res = await fetch(chrome.runtime.getURL('src/data/knowledge-base.json'));
  const entries = await res.json();
  $('#kbJson').value = JSON.stringify(entries, null, 2);
  status('已载入随包默认知识库，点「保存全部设置」生效。');
});

$('#grantHost').addEventListener('click', async () => {
  const base = document.querySelector('input[data-k="ark.baseUrl"]').value;
  let origin;
  try {
    origin = new URL(base).origin;
  } catch {
    $('#connStatus').className = 'err';
    $('#connStatus').textContent = 'Base URL 不合法';
    return;
  }
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  $('#connStatus').className = granted ? 'ok' : 'err';
  $('#connStatus').textContent = granted ? `已授权 ${origin}` : '未授权，BYOK 调用将被浏览器拦截';
});

/** 从 BYOK 表单读取临时 ark 配置（不经过保存、不写 storage），供「测试连接」即填即测 */
function draftArkFromForm() {
  const draft = { models: {} };
  document.querySelectorAll('input[data-k]').forEach((input) => {
    const k = input.dataset.k;
    if (!k.startsWith('ark.')) return;
    if (input.type === 'number') {
      if (input.value === '') return;
      const n = Number(input.value);
      if (Number.isFinite(n)) draft[k.slice(4)] = n; // ark.timeoutMs -> timeoutMs
      return;
    }
    const v = input.value.trim();
    if (k === 'ark.models.l1') draft.models.l1 = v;
    else if (k === 'ark.models.l2') draft.models.l2 = v;
    else draft[k.slice(4)] = v; // ark.baseUrl / ark.apiKey
  });
  return draft;
}

$('#testKey').addEventListener('click', () => {
  const base = document.querySelector('input[data-k="ark.baseUrl"]').value.trim();
  try {
    new URL(base);
  } catch {
    $('#connStatus').className = 'err';
    $('#connStatus').textContent = 'Base URL 不合法：应为 https://ark.cn-beijing.volces.com/api/v3';
    return;
  }
  $('#connStatus').className = 'muted';
  $('#connStatus').textContent = '测试中（使用表单当前值，不会保存）…';
  // P0-3：不先保存、不覆盖已存配置；失败原因已在后台归因为中文
  chrome.runtime.sendMessage({ type: 'crosschat:testKey', draft: draftArkFromForm() }, (resp) => {
    if (chrome.runtime.lastError) {
      $('#connStatus').className = 'err';
      $('#connStatus').textContent = `失败：${chrome.runtime.lastError.message}`;
      return;
    }
    if (!resp?.ok) {
      $('#connStatus').className = 'err';
      $('#connStatus').textContent = resp?.error || '测试失败';
      return;
    }
    $('#connStatus').className = 'ok';
    $('#connStatus').textContent = `测试通过：模型 ${resp.data.model} 正常响应（${resp.data.usage.prompt || 0}/${resp.data.usage.completion || 0} tokens）。点「保存全部设置」后正式生效。`;
  });
});

load().catch((e) => status(`加载失败：${e.message}`, 'err'));

// ---- §6 客服站点动态注入管理 ----
function siteStatus(text, cls = 'muted') {
  const el = $('#siteStatus');
  el.className = cls;
  el.textContent = text;
}

function makeSiteRow(label, sub, actionLabel, primary, onAction) {
  const row = document.createElement('div');
  row.className = 'site-row';
  const info = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'site-name';
  name.textContent = label;
  const detail = document.createElement('div');
  detail.className = 'muted';
  detail.textContent = sub;
  info.append(name, detail);
  const btn = document.createElement('button');
  btn.textContent = actionLabel;
  if (primary) btn.classList.add('primary');
  btn.addEventListener('click', () => onAction(btn));
  row.append(info, btn);
  return row;
}

async function renderSites() {
  const { patterns, presets } = await bg({ type: 'crosschat:sites:list' });
  const enabled = new Set(patterns);
  const presetPatterns = new Set();
  const box = $('#sitePresets');
  box.innerHTML = '';
  for (const preset of presets) {
    preset.patterns.forEach((p) => presetPatterns.add(p));
    const allOn = preset.patterns.every((p) => enabled.has(p));
    box.appendChild(makeSiteRow(
      preset.name,
      `${preset.patterns.length} 个域名匹配`,
      allOn ? '已启用 · 点击移除' : '启用',
      !allOn,
      async (btn) => {
        btn.disabled = true;
        try {
          if (allOn) {
            for (const p of preset.patterns) await bg({ type: 'crosschat:sites:remove', pattern: p });
            await chrome.permissions.remove({ origins: preset.patterns }).catch(() => {});
            siteStatus(`已移除 ${preset.name}，该站点不再注入。`);
          } else {
            const granted = await chrome.permissions.request({ origins: preset.patterns });
            if (!granted) {
              siteStatus('你取消了授权：未启用该站点。', 'err');
            } else {
              await bg({ type: 'crosschat:sites:add', patterns: preset.patterns });
              siteStatus(`已启用 ${preset.name}：打开该站点即可看到助手部件。`, 'ok');
            }
          }
          await renderSites();
        } catch (e) {
          siteStatus(`操作失败：${e.message}`, 'err');
        } finally {
          btn.disabled = false;
        }
      },
    ));
  }
  // 自定义（不属于任何预置的已启用 pattern）
  const customs = patterns.filter((p) => !presetPatterns.has(p));
  for (const p of customs) {
    box.appendChild(makeSiteRow(p, '自定义站点', '移除', false, async (btn) => {
      btn.disabled = true;
      try {
        await bg({ type: 'crosschat:sites:remove', pattern: p });
        await chrome.permissions.remove({ origins: [p] }).catch(() => {});
        siteStatus(`已移除 ${p}。`);
        await renderSites();
      } catch (e) {
        siteStatus(`操作失败：${e.message}`, 'err');
      } finally {
        btn.disabled = false;
      }
    }));
  }
}

$('#addCustomSite').addEventListener('click', async () => {
  const raw = $('#customSite').value.trim();
  if (!raw) return;
  const pattern = normalizePattern(raw);
  if (!pattern) {
    siteStatus('域名无法识别：请输入如 crm.example.com 的域名或完整 https:// 网址。', 'err');
    return;
  }
  try {
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) {
      siteStatus('你取消了授权：未添加。', 'err');
      return;
    }
    await bg({ type: 'crosschat:sites:add', patterns: [pattern] });
    $('#customSite').value = '';
    siteStatus(`已添加 ${pattern}。`, 'ok');
    await renderSites();
  } catch (e) {
    siteStatus(`添加失败：${e.message}`, 'err');
  }
});

// ---- §7 遥测开关 ----
async function renderTelemetry() {
  const s = await telemetry.state();
  $('#telemetryEnabled').checked = s.enabled;
  $('#telemetryState').textContent = s.clientId
    ? `匿名客户端 ID：${s.clientId.slice(0, 8)}…（随机生成，不关联身份）${s.lastDay ? `｜最近活跃日 ${s.lastDay}` : ''}`
    : '尚未生成匿名客户端 ID（首次产生统计时生成）。';
}

$('#telemetryEnabled').addEventListener('change', async (e) => {
  await telemetry.enable(e.target.checked);
  await renderTelemetry();
});

renderSites().catch((e) => siteStatus(`站点列表加载失败：${e.message}`, 'err'));
renderTelemetry().catch(() => {});
