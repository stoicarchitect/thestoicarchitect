/* The Stoic Architect - shared behaviour for every page */
(function () {
  var doc = document.documentElement;

  /* Header turns solid once the page scrolls */
  var head = document.querySelector('.site-head');
  function onScroll() { if (head) head.classList.toggle('is-solid', window.scrollY > 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  var btn = document.querySelector('.menu-btn');
  if (btn) {
    btn.addEventListener('click', function () {
      var open = doc.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.drawer a').forEach(function (a) {
      a.addEventListener('click', function () { doc.classList.remove('menu-open'); btn.setAttribute('aria-expanded', 'false'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && doc.classList.contains('menu-open')) { doc.classList.remove('menu-open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });
  }

  /* The colonnade rises once, the first time it comes into view */
  var cols = document.querySelectorAll('[data-raise]');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-raising'); io.unobserve(en.target); }
      });
    }, { threshold: 0.25 });
    cols.forEach(function (c) { io.observe(c); });
  }

  /* F5IVE Journey sign-up (Brevo, the same list as the homepage form).
     Any form with data-journey posts the email to that list. */
  var JOURNEY_ACTION = 'https://b91ab0ac.sibforms.com/serve/MUIFAPM-RMBoQRODsIB2NoOJSZz4z814wVCRpgwFeYFhpTBWoRjTq5QXWgEsI_KWeIxkVuv5FxFjIAcUgMYmKLBEdgj_70jpqn0nSEGa90Kd-usWBvoHz52DLlDlp5Wu_VcQcMSU9HlWttLxrYX6CLgUAC5zLTSM2gvrcX1p7E5Nv_5lcUDKXGtUNpuZuyMq0wIeX22qZqB3zLh4vA==';

  function say(form, text, ok) {
    var m = form.querySelector('.form-msg');
    if (!m) { m = document.createElement('p'); m.className = 'form-msg'; m.setAttribute('role', 'status'); form.appendChild(m); }
    m.textContent = text; m.className = 'form-msg ' + (ok ? 'ok' : 'err');
  }

  document.querySelectorAll('form[data-journey]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = form.querySelector('button[type=submit]'), label = b.textContent;
      var email = form.querySelector('input[type=email]').value.trim();
      var name = form.querySelector('input[name=FIRSTNAME]');
      var fd = new FormData();
      fd.append('EMAIL', email);
      if (name && name.value.trim()) fd.append('FIRSTNAME', name.value.trim());
      fd.append('OPT_IN', '1'); fd.append('email_address_check', ''); fd.append('locale', 'en');
      b.disabled = true; b.textContent = 'Sending';
      fetch(JOURNEY_ACTION + '?isAjax=1', { method: 'POST', body: fd, mode: 'no-cors' })
        .then(function () {
          b.textContent = 'Day One is on its way';
          form.querySelectorAll('input').forEach(function (i) { i.disabled = true; });
          say(form, 'Check your inbox. If nothing arrives in five minutes, look in promotions or spam.', true);
          if (window.gtag) gtag('event', 'generate_lead', { method: 'journey_' + (form.dataset.journey || 'site') });
        })
        .catch(function () {
          b.disabled = false; b.textContent = label;
          say(form, 'That did not go through. Check your connection and try again.', false);
        });
    });
  });

  /* Enquiries and waitlists (Formspree, delivered to Daniel's inbox).
     Any form with data-formspree posts every named field. */
  document.querySelectorAll('form[data-formspree]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = form.querySelector('button[type=submit]'), label = b.textContent;
      b.disabled = true; b.textContent = 'Sending';
      fetch('https://formspree.io/f/mlgpkjvl', { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (r) {
          if (!r.ok) throw new Error('bad');
          b.textContent = form.dataset.done || 'Sent';
          form.querySelectorAll('input, select, textarea').forEach(function (i) { i.disabled = true; });
          say(form, form.dataset.thanks || 'Received. Daniel replies personally, usually within a few days.', true);
          if (window.gtag) gtag('event', 'generate_lead', { method: form.dataset.formspree });
        })
        .catch(function () {
          b.disabled = false; b.textContent = label;
          say(form, 'That did not go through. Try again, or email F5ive@thestoicarchitect.com directly.', false);
        });
    });
  });
})();
