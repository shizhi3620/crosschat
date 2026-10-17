/* 中英切换：默认中文（扩展首要用户），选择存 localStorage；本站无 Cookie、无统计。 */
(function () {
  const KEY = 'cc_site_lang';
  const lang = localStorage.getItem(KEY) || 'zh';
  document.body.dataset.lang = lang;
  window.setSiteLang = (l) => {
    document.body.dataset.lang = l;
    localStorage.setItem(KEY, l);
    document.querySelectorAll('.langbar button').forEach((b) => {
      b.classList.toggle('on', b.dataset.lang === l);
    });
  };
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.langbar button').forEach((b) => {
      b.classList.toggle('on', b.dataset.lang === lang);
      b.addEventListener('click', () => window.setSiteLang(b.dataset.lang));
    });
  });
})();
