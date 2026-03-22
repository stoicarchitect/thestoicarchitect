// Nav scroll effect
var nav = document.getElementById('nav');
window.addEventListener('scroll', function() {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

// Mobile menu
function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

// Scroll reveal
var reveals = document.querySelectorAll('.reveal');
var observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
reveals.forEach(function(el) { observer.observe(el); });

// Stagger pillar animations
document.querySelectorAll('.pillar').forEach(function(el, i) {
  el.style.transitionDelay = (i * 0.07) + 's';
});

// ConvertKit
var CK_FORM_ID = '9232780';

function subscribeToConvertKit(email, btn, successText) {
  btn.textContent = 'Subscribing...';
  btn.disabled = true;
  fetch('https://app.convertkit.com/forms/' + CK_FORM_ID + '/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_address: email })
  }).then(function(res) {
    if (res.ok) {
      btn.textContent = successText || '\u2713 You\'re In';
      btn.style.background = '#2e7d32';
      btn.closest('form').querySelectorAll('input').forEach(function(i) { i.disabled = true; });
    } else {
      btn.textContent = 'Try Again';
      btn.disabled = false;
    }
  }).catch(function() {
    btn.textContent = 'Try Again';
    btn.disabled = false;
  });
}

function handleCapture(e) {
  e.preventDefault();
  var email = document.getElementById('captureEmail').value;
  var btn = e.target.querySelector('button');
  subscribeToConvertKit(email, btn, '\u2713 Check Your Inbox');
}

function handleContact(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button');
  btn.textContent = 'Sending...';
  btn.disabled = true;
  var data = new FormData(e.target);
  fetch('https://formspree.io/f/mlgpkjvl', {
    method: 'POST',
    body: data,
    headers: { 'Accept': 'application/json' }
  }).then(function(res) {
    if (res.ok) {
      btn.textContent = '\u2713 Message Sent';
      btn.style.background = '#2e7d32';
    } else {
      btn.textContent = 'Try Again';
      btn.disabled = false;
    }
  }).catch(function() {
    btn.textContent = 'Try Again';
    btn.disabled = false;
  });
}
