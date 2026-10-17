import { getConfig } from '../core/storage.js';

const $ = (s) => document.querySelector(s);

function send(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      resp?.ok ? resolve(resp.data) : reject(new Error(resp?.error || 'Unknown error'));
    });
  });
}

const pct = (x) => (x == null ? '–' : `${(x * 100).toFixed(1)}%`);
const fmtInt = (n) => (n || 0).toLocaleString();

async function render() {
  const [config, dash] = await Promise.all([
    getConfig(),
    send({ type: 'crosschat:dashboard' }),
  ]);
  const s = dash.summary;
  $('#month').textContent = `· ${dash.month} · ${config.mode === 'byok' ? 'BYOK' : '演示模式'}`;

  $('#kTotal').textContent = fmtInt(s.total);
  $('#kCost').textContent = `¥${s.cost.toFixed(2)}`;
  $('#kL0').textContent = pct(s.levelShare.L0);
  $('#kL2').textContent = pct(s.levelShare.L2);
  $('#kAdopt').textContent = pct(s.adoptionRate);
  $('#kResp').textContent = s.firstResponseMsMedian != null
    ? `${(s.firstResponseMsMedian / 1000).toFixed(1)}s`
    : '–';
  $('#kCache').textContent = pct(s.cacheHitRate);
  $('#kBlock').textContent = s.blockedCount;

  const quota = config.costControl.monthlyQuotaTokens;
  const nameOf = Object.fromEntries((config.stores || []).map((x) => [x.id, x.name]));
  $('#storeRows').innerHTML = '';
  for (const st of s.byStore) {
    const used = st.tokensPrompt + st.tokensCompletion;
    const ratio = quota ? Math.min(1, used / quota) : 0;
    const cls = ratio >= 1 ? 'cap' : ratio >= config.routing.tightenAtUsageRatio ? 'tighten' : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${nameOf[st.storeId] || st.storeId}</td>
      <td>${st.count}</td>
      <td>${fmtInt(st.tokensPrompt)}</td>
      <td>${fmtInt(st.tokensCompletion)}</td>
      <td>${fmtInt(st.tokensCached)}</td>
      <td>¥${st.cost.toFixed(4)}</td>
      <td>${st.levelCounts.L0}/${st.levelCounts.L1}/${st.levelCounts.L2}</td>
      <td><span class="bar"><span class="fill ${cls}" style="width:${(ratio * 100).toFixed(1)}%"></span></span>${(ratio * 100).toFixed(1)}%</td>`;
    $('#storeRows').appendChild(tr);
  }

  const meta = [
    `币种 ${dash.pricing.currency}`,
    dash.pricing.priceDate ? `现价日期 ${dash.pricing.priceDate}` : '2025 档占位价',
    dash.pricing.source ? `来源 ${dash.pricing.source}` : '',
  ].filter(Boolean).join('｜');
  $('#priceMeta').textContent = meta;

  const rows = [
    ['全量 L1（成本下限参考）', dash.projection.noCache.per1000.l1Only, dash.projection.cache60.per1000.l1Only],
    ['80/20 L1/L2 混合（建议默认）', dash.projection.noCache.per1000.mix, dash.projection.cache60.per1000.mix],
    ['全量 L2（成本上限参考）', dash.projection.noCache.per1000.l2Only, dash.projection.cache60.per1000.l2Only],
  ];
  $('#projRows').innerHTML = rows
    .map((r) => `<tr><td>${r[0]}</td><td>¥${r[1].toFixed(2)}</td><td>¥${r[2].toFixed(2)}</td></tr>`)
    .join('');
}

$('#reset').addEventListener('click', async () => {
  if (!confirm('确认清空全部本地计量事件？不影响配置与知识库。')) return;
  await send({ type: 'crosschat:resetMeter' });
  render();
});

render().catch((e) => {
  document.querySelector('main').innerHTML = `<p class="muted">看板加载失败：${e.message}</p>`;
});
