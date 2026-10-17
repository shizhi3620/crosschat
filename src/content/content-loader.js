/**
 * Classic content script（manifest 注入）。仅负责把 ESM 主模块拉起来，
 * 主逻辑全部在 content-main.js / core/*.js（service worker、options、单测共用）。
 */
(function () {
  if (window.__crosschatBootstrapped) return;
  window.__crosschatBootstrapped = true;
  const url = chrome.runtime.getURL('src/content/content-main.js');
  import(url)
    .then((mod) => mod.bootstrap({ fromContentScript: true }))
    .catch((err) => {
      // 降级：不影响宿主页，console 留痕便于排查 WAR/CSP
      console.warn('[CrossChat] failed to load module:', err);
    });
})();
