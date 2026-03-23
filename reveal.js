window.addEventListener('load', function() {
  document.documentElement.classList.add('js-loaded');
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function(el) { observer.observe(el); });
  } else {
    reveals.forEach(function(el) { el.classList.add('visible'); });
  }
});
