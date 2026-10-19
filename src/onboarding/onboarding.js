import { CONTACT_EMAIL } from '../config/telemetry.config.js';

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

$('contactMail').href = `mailto:${CONTACT_EMAIL}`;
$('privacyLink').textContent = `隐私问题联系：${CONTACT_EMAIL}`;

// 首启也算一次活跃；失败静默
send({ type: 'crosschat:dailyActive' }).catch(() => {});
