// Homepage hero (see assets/css/hero-mountain.css), scoped to .fh-hero and wired to the page's Lenis instance.
// Runs after the page's main script, which registers ScrollTrigger and feeds it Lenis' scroll.
(function () {
  var hero = document.querySelector('.fh-hero');
  if (!hero || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mm = gsap.matchMedia();

  // ── Mountain frame: the cloud wipe cuts a hole (mask #hole) onto the end frame underneath;
  // the white panel behind the front cloud fades as the wipe gets going.
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    gsap
      .timeline({
        scrollTrigger: { trigger: '.fh-hero .scrollDist', start: '0 0', end: '100% 100%', scrub: 1 }
      })
      .fromTo('.fh-mountain .sky', { y: 0 }, { y: -200 }, 0)
      .fromTo('.fh-mountain .cloud1', { y: 100 }, { y: -870 }, 0) // extra -70 offsets the scene's shift down
      .fromTo('.fh-mountain .cloud2', { y: -150 }, { y: -500 }, 0)
      .fromTo('.fh-mountain .cloud3', { y: -50 }, { y: -650 }, 0)
      .fromTo('.fh-mountain .mountBg', { y: -10 }, { y: -100 }, 0)
      .fromTo('.fh-mountain .mountMg', { y: -30 }, { y: -250 }, 0)
      .fromTo('.fh-mountain .mountFg', { y: -50 }, { y: -600 }, 0)
      // the tweens above use GSAP's default 0.5s, so the timeline is 0.5 long; these fit inside it
      .to('.fh-hero #arrow-btn', { autoAlpha: 0, duration: 0.025 }, 0.125)
      .to('.fh-mountain .panel', { opacity: 0, duration: 0.175 }, 0.1);

    // the scroll cue's arrow bobs gently
    gsap.to('.fh-hero #arrow-btn .arrow', { y: 5, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1 });

    // ── End frame: every layer rises into place at its own speed while it settles
    var spacer = document.querySelector('.fh-hero .endScroll');
    gsap.timeline({
      defaults: { ease: 'none', duration: 1 },
      scrollTrigger: { trigger: spacer, start: 'top bottom', end: 'bottom bottom', scrub: 1 }
    })
      .from('.fh-hero .v4 .sky', { y: 80 }, 0)
      .from('.fh-hero .v4 .backdrop', { y: 35 }, 0)
      .from('.fh-hero .v4 .ground', { y: 90 }, 0)
      .from('.fh-hero .v4 .cabin', { y: 80 }, 0)
      .from('.fh-hero .v4 .we', { y: 30 }, 0)
      .from('.fh-hero .v4 h1', { y: 45 }, 0)
      .from('.fh-hero .v4 .sub', { y: 55 }, 0)
      .from('.fh-hero .v4 .caps li', { autoAlpha: 0, y: 18, duration: 0.3, stagger: { each: 0.025, from: 'end' } }, 0.35)
      .from('.fh-hero .v4 .see', { autoAlpha: 0, y: 16, duration: 0.15 }, 0.55);
  });

  // Reduced motion: no scrubbed wipe; past the first half of the scroll, swap to the end frame
  mm.add('(prefers-reduced-motion: reduce)', function () {
    ScrollTrigger.create({
      trigger: '.fh-hero .scrollDist',
      start: '50% 0',
      end: 'max', // stays swapped until you scroll back up past the halfway point
      toggleClass: { targets: 'body', className: 'show-end' }
    });
  });

  // While the hero is on screen, the nav drops its difference blend (see the CSS)
  ScrollTrigger.create({
    trigger: hero,
    start: 'top bottom',
    end: 'bottom top',
    toggleClass: { targets: document.documentElement, className: 'fh-in-hero' }
  });

  // ── Fit the mountain scene: the art is 1200x800; on screens taller than that (phones) crop the sides
  // so it fills the height, then shrink the words to fit.
  var scene = hero.querySelector('.fh-mountain .scene');
  var headlines = hero.querySelectorAll('.fh-mountain .headline');
  var lead = hero.querySelector('.fh-mountain .lead');

  function fitText(nodes, max, room, byLine) {
    nodes.forEach(function (t) { t.style.fontSize = max + 'px'; });
    var lines = [];
    nodes.forEach(function (t) { lines = lines.concat(byLine ? Array.from(t.querySelectorAll('tspan')) : [t]); });
    var widest = Math.max.apply(null, lines.map(function (l) { return l.getComputedTextLength(); }));
    var size = Math.min(max, (max * room) / widest);
    nodes.forEach(function (t) { t.style.fontSize = size + 'px'; });
  }

  function fitScene() {
    var box = scene.getBoundingClientRect();
    if (!box.width || !box.height) return;
    var w = Math.min(1200, (800 * box.width) / box.height);
    scene.setAttribute('viewBox', (600 - w / 2) + ' 0 ' + w + ' 800');

    var stacked = w < 900;
    var leadLines = lead.dataset[stacked ? 'narrow' : 'wide'].split('|');
    lead.replaceChildren.apply(lead, leadLines.map(function (line, i) {
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      t.setAttribute('x', 600);
      if (i) t.setAttribute('dy', '1em');
      t.textContent = line;
      return t;
    }));

    fitText(Array.from(headlines), 99, w * 0.86);
    var head = parseFloat(headlines[0].style.fontSize);
    fitText([lead], head * 0.82, w * 0.86, true);
    var leadSize = parseFloat(lead.style.fontSize);

    var top = stacked ? 128 : 124; // 20 lower than /hero, clear of the site nav
    lead.setAttribute('y', top);
    var headY = top + (leadLines.length - 1) * leadSize + head;
    headlines.forEach(function (t) { t.setAttribute('y', headY); });
  }

  fitScene();
  if (document.fonts) document.fonts.ready.then(fitScene);
  window.addEventListener('resize', fitScene);

  // The scroll cue plays the whole wipe and stops on the settled end frame (the end of .endScroll)
  var arrowBtn = hero.querySelector('#arrow-btn');
  if (arrowBtn) {
    arrowBtn.addEventListener('click', function () {
      // reduced motion has no .endScroll; the swap happens halfway down .scrollDist, so its end is safely past it
      var target = reduceMotion
        ? hero.querySelector('.scrollDist').getBoundingClientRect().bottom + window.scrollY
        : hero.querySelector('.endScroll').getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
      if (typeof lenis !== 'undefined') lenis.scrollTo(target, { duration: reduceMotion ? 0 : 3.5 });
      else window.scrollTo({ top: target, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }
})();
