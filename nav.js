const nav = document.getElementById('nav');
window.addEventListener('scroll', function() {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});
function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}
