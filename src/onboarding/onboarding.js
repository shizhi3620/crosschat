import { WAITLIST_FORM_URL, CONTACT_EMAIL } from '../config/telemetry.config.js';

const $ = (id) => document.getElementById(id);

function send(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (resp) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      resp?.ok ? resolve(resp.data) : reject(new Error(resp?.error || 'Unknown error'));
    });
  });
}

function url(path) {
  return chrome.runtime.getURL(path);
}

$('ver').textContent = `v${chrome.runtime.getManifest().version}`;

$('openDemo').addEventListener('click', () => chrome.tabs.create({ url: url('src/demo/demo.html') }));
$('openSites').addEventListener('click', () => chrome.tabs.create({ url: `${url('src/options/options.html')}#sites` }));
$('openByok').addEventListener('click', () => chrome.tabs.create({ url: `${url('src/options/options.html')}#byok` }));
$('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage());
$('openDashboard').addEventListener('click', () => chrome.tabs.create({ url: url('src/dashboard/dashboard.html') }));

if (WAITLIST_FORM_URL) {
  const link = $('waitlistFormLink');
  link.href = WAITLIST_FORM_URL;
  link.classList.remove('hidden');
  $('waitlistForm').classList.add('hidden');
} else {
  $('waitlistFormLink').remove();
  $('joinWaitlist').addEventListener('click', async () => {
    const email = $('waitlistEmail').value.trim();
    const st = $('waitlistStatus');
    try {
      const r = await send({ type: 'crosschat:waitlist:join', email });
      st.className = 'ok';
      st.textContent = `已在本机登记意向（本机记录第 ${r.count} 条）。邮箱未离开本设备，正式报名入口上线后请回到此页。`;
    } catch (e) {
      st.className = 'err';
      st.textContent = e.message;
    }
  });
}

$('privacyLink').textContent = `隐私问题联系：${CONTACT_EMAIL}`;

// 首启也算一次活跃；失败静默
send({ type: 'crosschat:dailyActive' }).catch(() => {});
