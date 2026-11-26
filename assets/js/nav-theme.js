/* Switches the nav between light and dark styling depending on the section under it.
   Loaded at the end of <body>, in the place the inline script used to be. */

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
