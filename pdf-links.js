(function () {
  var me = document.currentScript;
  if (!me) return;
  var root = new URL('./', me.src).href;
  var viewer = new URL('pdf.html', me.src).href;
  var hosts = ['d39aa.org', 'www.d39aa.org', 'district-39.github.io'];

  function sitePath(a) {
    var u;
    try { u = new URL(a.getAttribute('href'), location.href); } catch (e) { return null; }
    if (!/\.pdf$/i.test(u.pathname)) return null;
    var clean = u.href.split(/[?#]/)[0];
    if (clean.indexOf(root) === 0) return decodeURI(clean.slice(root.length));
    if (hosts.indexOf(u.hostname) >= 0) return decodeURI(u.pathname.replace(/^\//, ''));
    return null;
  }

  function label(a) {
    var t = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim();
    t = t.replace(/\s*\(PDF[^)]*\)\s*$/i, '').replace(/^download\s+/i, '');
    var box = a.closest('ul.events > li, .card, .docset');
    var h = box && box.querySelector('h3, h2');
    if (h && t.split(' ').length <= 4) t = h.textContent.trim() + ' – ' + t;
    return t;
  }

  function run() {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var p = sitePath(a);
      if (!p) return;
      var t = label(a);
      a.href = viewer + '?file=' + encodeURIComponent(p) + (t ? '&title=' + encodeURIComponent(t) : '');
      a.removeAttribute('target');
      a.removeAttribute('rel');
      a.removeAttribute('type');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
