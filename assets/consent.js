/* The Stoic Architect - cookie consent.
   Nothing that sets non-essential cookies loads until the visitor says yes.
   Analytics = Google Analytics 4. Marketing = LinkedIn Insight Tag.
   Include once per page, in <head>:  <script src="/assets/consent.js" defer></script>
   Any element with data-cookie-settings reopens the choices. */
(function () {
  var KEY = 'tsa-consent-v1';
  var MAX_AGE = 365 * 864e5;
  var GA_ID = 'G-3WJHZYMBLF';
  var LI_ID = '9707410';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });

  function read() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY));
      if (c && typeof c.analytics === 'boolean' && Date.now() - c.ts < MAX_AGE) return c;
    } catch (e) {}
    return null;
  }
  function write(analytics, marketing) {
    var prev = read();
    var c = { analytics: !!analytics, marketing: !!marketing, ts: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {}
    var withdrawn = prev && ((prev.analytics && !c.analytics) || (prev.marketing && !c.marketing));
    if (withdrawn) { clearGa(); location.reload(); return c; }
    apply(c);
    return c;
  }
  function clearGa() {
    document.cookie.split(';').forEach(function (k) {
      var n = k.split('=')[0].trim();
      if (/^_ga|^_gid|^_gat/.test(n)) {
        ['', '; domain=' + location.hostname, '; domain=.' + location.hostname.replace(/^www\./, '')].forEach(function (d) {
          document.cookie = n + '=; Max-Age=0; path=/' + d;
        });
      }
    });
  }

  var loaded = { ga: false, li: false };
  function apply(c) {
    if (c.analytics && !loaded.ga) {
      loaded.ga = true;
      gtag('consent', 'update', { analytics_storage: 'granted' });
      var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
      document.head.appendChild(s);
      gtag('js', new Date()); gtag('config', GA_ID);
    }
    if (c.marketing && !loaded.li) {
      loaded.li = true;
      gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted' });
      window._linkedin_partner_id = LI_ID;
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(LI_ID);
      if (!window.lintrk) { window.lintrk = function (a, b) { window.lintrk.q.push([a, b]); }; window.lintrk.q = []; }
      var l = document.createElement('script'); l.async = true; l.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
      document.head.appendChild(l);
    }
  }

  var CSS = '' +
    '.tsa-ck{position:fixed;left:16px;right:16px;bottom:16px;z-index:400;max-width:760px;margin:0 auto;background:#1C1915;color:#EFE6D4;border:1px solid rgba(200,160,77,.35);box-shadow:0 24px 60px -20px rgba(0,0,0,.8);padding:22px 24px;font:400 15px/1.55 Archivo,system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '.tsa-ck[hidden]{display:none}' +
    '.tsa-ck h2{font:600 17px/1.3 Cinzel,Georgia,serif;letter-spacing:.04em;margin:0 0 8px;color:#EFE6D4}' +
    '.tsa-ck p{margin:0 0 16px;color:#C9BFAE;max-width:none}' +
    '.tsa-ck a{color:#C8A04D}' +
    '.tsa-ck .row{display:flex;flex-wrap:wrap;gap:10px}' +
    '.tsa-ck button{flex:1 1 150px;min-height:46px;padding:0 18px;border-radius:2px;cursor:pointer;font:600 15px/1 inherit;font-family:inherit;border:1px solid #C8A04D}' +
    '.tsa-ck .pri{background:#C8A04D;color:#12100E}.tsa-ck .pri:hover{background:#E0BE6E}' +
    '.tsa-ck .sec{background:transparent;color:#EFE6D4}.tsa-ck .sec:hover{color:#E0BE6E}' +
    '.tsa-ck .opts{margin:4px 0 16px;border-top:1px solid rgba(239,230,212,.1)}' +
    '.tsa-ck .opt{display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:1px solid rgba(239,230,212,.1)}' +
    '.tsa-ck .opt input{margin-top:4px;width:20px;height:20px;accent-color:#C8A04D;flex-shrink:0}' +
    '.tsa-ck .opt b{display:block;color:#EFE6D4}.tsa-ck .opt span{color:#A69B8A;font-size:14px}' +
    '.tsa-ck :focus-visible{outline:2px solid #E0BE6E;outline-offset:2px}';

  var box;
  function build() {
    if (box) return box;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    box = document.createElement('div');
    box.className = 'tsa-ck'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', 'Cookie choices'); box.hidden = true;
    box.innerHTML =
      '<h2>Your cookie choices</h2>' +
      '<p>We use essential cookies to run this site. With your permission we would also like to use analytics cookies to see which pages help people, and a LinkedIn tag to measure our adverts. Nothing optional loads unless you say yes. <a href="/cookies.html">Cookie policy</a></p>' +
      '<div class="opts" hidden>' +
        '<label class="opt"><input type="checkbox" checked disabled><span><b>Essential</b><span>Security, remembering this choice, and keeping you signed in to your F5IVE account. Always on.</span></span></label>' +
        '<label class="opt"><input type="checkbox" data-k="analytics"><span><b>Analytics</b><span>Google Analytics. Tells us which pages are visited and how, in aggregate.</span></span></label>' +
        '<label class="opt"><input type="checkbox" data-k="marketing"><span><b>Marketing</b><span>LinkedIn Insight Tag. Measures whether our LinkedIn adverts lead to sign-ups.</span></span></label>' +
      '</div>' +
      '<div class="row">' +
        '<button type="button" class="pri" data-a="all">Accept all</button>' +
        '<button type="button" class="pri" data-a="none">Reject all</button>' +
        '<button type="button" class="sec" data-a="choose">Choose</button>' +
      '</div>';
    document.body.appendChild(box);
    var opts = box.querySelector('.opts');
    box.addEventListener('click', function (e) {
      var a = e.target.getAttribute && e.target.getAttribute('data-a');
      if (!a) return;
      if (a === 'all') { write(true, true); close(); }
      else if (a === 'none') { write(false, false); close(); }
      else if (a === 'choose') {
        opts.hidden = false; e.target.textContent = 'Save choices'; e.target.setAttribute('data-a', 'save');
      } else if (a === 'save') {
        write(box.querySelector('[data-k=analytics]').checked, box.querySelector('[data-k=marketing]').checked); close();
      }
    });
    return box;
  }
  function open(showOptions) {
    build();
    var c = read() || { analytics: false, marketing: false };
    box.querySelector('[data-k=analytics]').checked = c.analytics;
    box.querySelector('[data-k=marketing]').checked = c.marketing;
    var btn = box.querySelector('[data-a=choose],[data-a=save]');
    box.querySelector('.opts').hidden = !showOptions;
    btn.textContent = showOptions ? 'Save choices' : 'Choose';
    btn.setAttribute('data-a', showOptions ? 'save' : 'choose');
    box.hidden = false;
  }
  function close() { if (box) box.hidden = true; }

  window.TSAConsent = { open: function () { open(true); }, get: read };

  function init() {
    var c = read();
    if (c) apply(c); else open(false);
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-cookie-settings]');
      if (t) { e.preventDefault(); open(true); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
