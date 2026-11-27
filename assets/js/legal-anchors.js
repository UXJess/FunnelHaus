/* Legal pages: in-page anchor links scroll smoothly and move focus to the section.
   Loaded at the end of <body>, in the place the inline script used to be. */

// In-page anchors: scroll with Lenis and move focus to the section.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.legal a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var offset = window.innerWidth <= 768 ? -24 : -104;
      if (typeof lenis !== 'undefined') {
        lenis.scrollTo(target, { offset: offset, immediate: reduce, duration: 1.1 });
      } else {
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      }
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      history.replaceState(null, '', '#' + id);
    });
  });
})();
