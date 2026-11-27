/* Behaviour for the portfolio pages (portfolio, rocky-mountain-solutions).
   Loaded at the end of <body>, in the place the inline script used to be. */

const lenis = new Lenis({
  duration: 1.15,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  smoothTouch: false
});
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

document.getElementById('back-top')?.addEventListener('click', (e) => {
  e.preventDefault();
  lenis.scrollTo(0, { duration: 1.4 });
});

document.querySelectorAll('.cs-jump a').forEach((link) => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (!href || href.charAt(0) !== '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -24, duration: 1.2 });
  });
});

(function () {
  const trigger = document.querySelector('.nav-links li.has-dropdown > a');
  const li = trigger?.closest('li');
  const dropdown = document.getElementById('caps-dropdown');
  if (!trigger || !li || !dropdown) return;
  function positionDropdown() {
    const rect = trigger.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 12) + 'px';
    dropdown.style.left = rect.left + 'px';
  }
  let hideTimer;
  function show() { clearTimeout(hideTimer); positionDropdown(); dropdown.classList.add('is-open'); }
  function hide() { hideTimer = setTimeout(() => dropdown.classList.remove('is-open'), 150); }
  li.addEventListener('mouseenter', show);
  li.addEventListener('mouseleave', hide);
  dropdown.addEventListener('mouseenter', show);
  dropdown.addEventListener('mouseleave', hide);
  trigger.addEventListener('focus', show);
})();

(function () {
  const hamburger = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!hamburger || !mobileMenu) return;
  function setOpen(isOpen) {
    hamburger.classList.toggle('is-open', isOpen);
    mobileMenu.classList.toggle('is-open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    mobileMenu.setAttribute('aria-hidden', String(!isOpen));
    const overlay = document.getElementById('mobileOverlay');
    if (overlay) overlay.classList.toggle('is-open', isOpen);
    document.documentElement.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) lenis.stop(); else lenis.start();
  }
  hamburger.addEventListener('click', () => setOpen(!hamburger.classList.contains('is-open')));
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.getElementById('mobileOverlay')?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
  const capsToggle = document.getElementById('capsToggle');
  const capsSubMenu = document.getElementById('capsSubMenu');
  capsToggle?.addEventListener('click', () => {
    const isOpen = capsToggle.getAttribute('aria-expanded') === 'true';
    capsToggle.setAttribute('aria-expanded', String(!isOpen));
    capsSubMenu.classList.toggle('is-open', !isOpen);
  });
})();

(function () {
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.querySelectorAll('.sprint-month').forEach(function (el) { el.textContent = months[new Date().getMonth()]; });
  document.querySelectorAll('.fh-year').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();

(function () {
  var nav = document.querySelector('.nav');
  if (!nav) return;
  function updateNavTheme() {
    var sampleY = window.innerWidth <= 768 ? window.innerHeight - 30 : 48;
    var els = document.elementsFromPoint(window.innerWidth / 2, sampleY);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el === nav || nav.contains(el)) continue;
      var bg = window.getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        var m = bg.match(/\d+/g);
        if (m) {
          var lum = (0.299 * +m[0] + 0.587 * +m[1] + 0.114 * +m[2]) / 255;
          nav.classList.toggle('nav--light', lum > 0.65);
          return;
        }
      }
    }
  }
  window.addEventListener('scroll', updateNavTheme, { passive: true });
  updateNavTheme();
})();
