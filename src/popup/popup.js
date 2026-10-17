import { getConfig } from '../core/storage.js';
import { normalizePattern } from '../core/sites.js';

const $ = (id) => document.getElementById(id);

function send(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      resp?.ok ? resolve(resp.data) : reject(new Error(resp?.error || 'Unknown error'));
    });
  });
}

function pct(x) {
  return x == null ? '–' : `${(x * 100).toFixed(0)}%`;
}

async function render() {
  const [config, dash] = await Promise.all([
    getConfig(),
    send({ type: 'crosschat:dashboard' }).catch(() => null),
  ]);

  $('modeBadge').className = `badge ${config.mode === 'byok' ? 'byok' : 'demo'}`;
  $('modeBadge').textContent = config.mode === 'byok' ? 'BYOK' : '演示模式';

  if (!dash) return;
  const s = dash.summary;
  $('kpiCost').textContent = `¥${s.cost.toFixed(2)}`;
  $('kpiL0').textContent = pct(s.levelShare.L0);
  $('kpiAdopt').textContent = pct(s.adoptionRate);
  $('kpiResp').textContent = s.firstResponseMsMedian != null
    ? `${(s.firstResponseMsMedian / 1000).toFixed(0)}s`
    : '–';
  $('lvlL0').textContent = s.levelCounts.L0 || 0;
  $('lvlL1').textContent = s.levelCounts.L1 || 0;
  $('lvlL2').textContent = s.levelCounts.L2 || 0;

  // 配额按最紧张的店铺展示
  const quota = config.costControl.monthlyQuotaTokens;
  let maxRatio = 0;
  for (const st of s.byStore) {
    const used = st.tokensPrompt + st.tokensCompletion;
    maxRatio = Math.max(maxRatio, used / quota);
  }
  const bar = $('quotaBar');
  bar.style.width = `${Math.min(100, maxRatio * 100).toFixed(1)}%`;
  bar.className = `fill ${maxRatio >= 1 ? 'cap' : maxRatio >= config.routing.tightenAtUsageRatio ? 'tighten' : 'normal'}`;
  $('quotaText').textContent =
    `最高单店 ${(maxRatio * 100).toFixed(1)}%｜≥${(config.routing.tightenAtUsageRatio * 100).toFixed(0)}% 收紧 L2，≥100% 强制 L1｜${dash.month}`;
}

$('openDashboard').addEventListener('click', () =>
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') }));
$('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('openDemo').addEventListener('click', () =>
  chrome.tabs.create({ url: chrome.runtime.getURL('src/demo/demo.html') }));

render().catch((e) => {
  document.querySelector('footer').textContent = `加载失败：${e.message}`;
});

// 当前标签页站点启用/移除（动态注入，用户手势授权）
async function renderSiteBar() {
  const line = $('siteLine');
  const btn = $('toggleSite');
  btn.classList.add('hidden');
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    line.textContent = '无法读取当前标签页';
    return;
  }
  let url;
  try {
    url = new URL(tab.url || '');
  } catch {
    line.textContent = '当前页面不支持注入（浏览器内部页）';
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    line.textContent = `当前页面 ${url.protocol}// 不支持注入`;
    return;
  }
  const pattern = normalizePattern(url.origin);
  const { patterns } = await send({ type: 'crosschat:sites:list' });
  const enabled = new Set(patterns);
  const isOn = enabled.has(pattern);
  line.textContent = isOn
    ? `助手已在此站点启用：${url.hostname}`
    : `此站点尚未启用助手：${url.hostname}`;
  btn.classList.remove('hidden');
  btn.textContent = isOn ? '从此站点移除' : '在此站点启用助手';
  if (!isOn) btn.classList.add('primary');
  else btn.classList.remove('primary');
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      if (isOn) {
        await send({ type: 'crosschat:sites:remove', pattern });
        await chrome.permissions.remove({ origins: [pattern] }).catch(() => {});
      } else {
        const granted = await chrome.permissions.request({ origins: [pattern] });
        if (!granted) { line.textContent = '已取消授权，未启用。'; return; }
        await send({ type: 'crosschat:sites:add', patterns: [pattern] });
      }
      await renderSiteBar();
    } catch (e) {
      line.textContent = `操作失败：${e.message}`;
    } finally {
      btn.disabled = false;
    }
  };
}

renderSiteBar().catch(() => { $('siteLine').textContent = '站点状态不可用'; });
send({ type: 'crosschat:dailyActive' }).catch(() => {});
