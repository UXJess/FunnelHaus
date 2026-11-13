/*
 * Kith & Kiln — portfolio page.
 * The name is in place when the page opens. Scroll lifts the white cloud,
 * and the letters rise into an arch: the middle climbs highest, and each
 * letter turns to sit on the curve. The letters straighten and give way
 * to one mark that sits with the brief; then the mark and the sentence
 * scroll up together.
 */
(function () {
  'use strict';

  var sheet = document.getElementById('kk-msheet');
  function setMenu(open) {
    document.body.classList.toggle('is-menu-open', open);
    if (sheet) sheet.hidden = !open;
    document.querySelectorAll('[data-menu-open]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  document.querySelectorAll('[data-menu-open]').forEach(function (btn) {
    btn.addEventListener('click', function () { setMenu(true); });
  });
  document.querySelectorAll('[data-menu-close]').forEach(function (btn) {
    btn.addEventListener('click', function () { setMenu(false); });
  });
  if (sheet) {
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) setMenu(false);
    });
    sheet.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var letters = gsap.utils.toArray('.hero-c__letter');
  var large = gsap.utils.toArray('[data-steam="large"]');
  var mist = document.querySelector('.hero-c__mist');
  var name = document.querySelector('.hero-c__name');
  var mark = document.querySelector('.hero-c__mark');
  var bar = document.querySelector('.hero-c-bar');
  var mnavBars = gsap.utils.toArray('.kk-mnav');
  var brief = document.querySelector('.hero-c__brief');

  function markWidth() {
    if (!name) return 136;
    return name.offsetWidth * (window.matchMedia('(max-width: 860px)').matches ? 0.5 : 0.17);
  }

  function placeCopy() {
    if (!brief) return;
    var hold = document.querySelector('.hero-c__hold');
    var view = hold ? hold.offsetHeight : window.innerHeight;
    var logoW = markWidth();
    var logoH = logoW * (662 / 1008);
    if (mark && logoW) mark.style.width = logoW + 'px';
    var pad = view / 2 - logoH / 2;
    brief.style.paddingTop = Math.round(Math.max(pad, 24)) + 'px';
  }

  function bindHold() {
    var hold = document.querySelector('.hero-c__hold');
    if (!hold || !brief) return;
    ScrollTrigger.create({
      trigger: hold,
      start: 'top top',
      endTrigger: brief,
      end: 'top top',
      pin: true,
      pinSpacing: false
    });
  }

  function bindSettle() {
    if (!brief || !name) return;
    var settle = gsap.timeline({
      scrollTrigger: {
        trigger: brief,
        start: 'top bottom',
        end: 'top top',
        scrub: true,
        invalidateOnRefresh: true
      }
    });
    var letterRow = document.querySelector('.hero-c__letters');
    if (letterRow) {
      settle.fromTo(letterRow, { opacity: 1 }, {
        opacity: 0,
        duration: 0.12,
        ease: 'none',
        immediateRender: false
      }, 0);
    }
    if (mark) {
      settle.fromTo(mark, { opacity: 0, scale: 2.4 }, {
        opacity: 1,
        scale: 1,
        duration: 0.34,
        ease: 'none',
        immediateRender: false
      }, 0.16);
    }
    letters.forEach(function (el) {
      settle.fromTo(el, {
        y: function () { return el._arch ? el._arch.y : 0; },
        rotation: function () { return el._arch ? el._arch.rotation : 0; }
      }, {
        y: 0,
        rotation: 0,
        ease: 'none',
        immediateRender: false
      }, 0);
    });
  }

  function bindReading() {
    if (reduce) return;
    var nodes = gsap.utils.toArray([
      '.hero-c__statement',
      '.hero-c__fine',
      '.rooms__open h2',
      '.rooms__open p',
      '.room__copy h3',
      '.room__copy > p:not(.room__label)',
      '.plate__title',
      '.plate__copy',
      '.site-foot__name',
      '.site-foot__place',
      '.site-foot__note',
      '.site-foot__links a'
    ].join(','));
    nodes.forEach(function (el) { el.classList.add('is-read'); });
    function paint() {
      var line = window.innerHeight * 0.68;
      var i = nodes.length;
      while (i--) {
        var el = nodes[i];
        var rect = el.getBoundingClientRect();
        if (rect.bottom < -20 || rect.top > window.innerHeight + 20) continue;
        var stop = (line - rect.top) / Math.max(rect.height, 1) * 100;
        el.style.setProperty('--read', stop.toFixed(1) + '%');
      }
    }
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: paint,
      onRefresh: paint
    });
    paint();
  }

  function bindInk() {
    if (!brief) return;
    ScrollTrigger.create({
      trigger: brief,
      start: 'top center',
      end: 'bottom top',
      onToggle: function (self) {
        if (name) name.classList.toggle('is-ink', self.isActive);
      }
    });
    if (bar || mnavBars.length) {
      ScrollTrigger.create({
        trigger: brief,
        start: 'top 80px',
        end: 'bottom top',
        onToggle: function (self) {
          if (bar) bar.classList.toggle('is-ink', self.isActive);
          mnavBars.forEach(function (el) {
            el.classList.toggle('is-ink', self.isActive);
          });
        }
      });
    }
  }

  function bindMore() {
    var btn = document.querySelector('.kk-more');
    var brief = document.querySelector('.hero-c__brief');
    if (!btn || !brief) return;
    var label = btn.querySelector('.kk-more__label');
    var arrow = btn.querySelector('.kk-more__arrow');
    var done = false;
    var behavior = reduce ? 'auto' : 'smooth';
    gsap.set(btn, { xPercent: -50 });
    gsap.set(arrow, { autoAlpha: 0 });

    function atBottom() {
      var doc = document.documentElement;
      return window.scrollY + window.innerHeight >= doc.scrollHeight - 24;
    }

    function settleArrow() {
      gsap.killTweensOf([btn, label, arrow]);
      btn.classList.remove('is-top');
      btn.classList.add('is-arrow');
      label.textContent = 'Learn more';
      gsap.set(btn, { clearProps: 'width,transform' });
      gsap.set(label, { clearProps: 'opacity,visibility' });
      gsap.set(arrow, { clearProps: 'opacity,visibility,transform' });
      btn.setAttribute('aria-label', 'Scroll down');
    }

    function settleTop() {
      gsap.killTweensOf([btn, label, arrow]);
      btn.classList.remove('is-arrow');
      btn.classList.add('is-top');
      label.textContent = 'Back to the top';
      gsap.set(btn, { clearProps: 'width,transform' });
      gsap.set(label, { clearProps: 'opacity,visibility' });
      gsap.set(arrow, { clearProps: 'opacity,visibility,transform' });
      btn.setAttribute('aria-label', 'Back to the top');
    }

    function reset() {
      done = false;
      gsap.killTweensOf([btn, label, arrow]);
      btn.classList.remove('is-arrow', 'is-top');
      label.textContent = 'Learn more';
      btn.removeAttribute('aria-label');
      gsap.set(btn, { clearProps: 'width,transform' });
      gsap.set(btn, { xPercent: -50, rotation: 0 });
      gsap.set(label, { clearProps: 'opacity,visibility' });
      gsap.set(arrow, { autoAlpha: 0, clearProps: 'transform' });
    }

    function morph() {
      if (done) return;
      done = true;
      if (reduce) {
        settleArrow();
        return;
      }
      gsap.to(label, { autoAlpha: 0, duration: 0.2, ease: 'power2.out' });
      gsap.to(arrow, { autoAlpha: 1, duration: 0.3, delay: 0.08, ease: 'power2.out' });
      gsap.to(btn, {
        width: 44,
        x: function () { return window.innerWidth / 2 - 38; },
        rotation: 0,
        duration: 0.7,
        ease: 'power3.inOut',
        onComplete: function () {
          if (atBottom()) settleTop();
          else settleArrow();
        }
      });
    }

    function whenAt(test, then) {
      var stop = performance.now() + 1800;
      function watch() {
        if (test() || performance.now() > stop) {
          then();
          return;
        }
        requestAnimationFrame(watch);
      }
      requestAnimationFrame(watch);
    }

    btn.addEventListener('click', function () {
      if (btn.classList.contains('is-top')) {
        window.scrollTo({ top: 0, behavior: behavior });
        whenAt(function () { return window.scrollY < 8; }, reset);
        return;
      }
      if (btn.classList.contains('is-arrow')) {
        window.scrollBy({
          top: Math.round(window.innerHeight * 0.86),
          behavior: behavior
        });
        return;
      }
      var top = brief.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top, behavior: behavior });
    });

    ScrollTrigger.create({
      trigger: brief,
      start: 'top 80px',
      onEnter: morph
    });

    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: function () {
        if (!done) return;
        if (atBottom()) {
          if (!btn.classList.contains('is-top')) settleTop();
        } else if (btn.classList.contains('is-top')) {
          settleArrow();
        }
      }
    });
  }

  function bindNews() {
    var form = document.querySelector('.site-foot__form');
    if (!form) return;
    var status = form.querySelector('.site-foot__status');
    var email = form.querySelector('input[type="email"]');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var trap = form.querySelector('input[name="company"]');
      if (trap && trap.value) {
        status.textContent = "You're on the list.";
        form.reset();
        return;
      }
      var value = (email.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        status.textContent = 'Enter an email address.';
        email.focus();
        return;
      }
      status.textContent = "You're on the list.";
      form.reset();
    });
  }

  ScrollTrigger.addEventListener('refreshInit', placeCopy);
  placeCopy();
  function bindMassageFilm() {
    var video = document.querySelector('#massage video');
    if (!video || reduce || !('IntersectionObserver' in window)) return;
    video.loop = false;
    video.muted = true;
    video.playsInline = true;
    var started = false;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || started) return;
        started = true;
        var play = video.play();
        if (play && play.then) {
          play.then(function () { observer.disconnect(); }).catch(function () { started = false; });
        } else {
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 });
    observer.observe(video);
  }

  bindMore();
  bindNews();
  bindMassageFilm();

  if (reduce || !letters.length) {
    if (mark) gsap.set(mark, { opacity: 1, scale: 1 });
    bindHold();
    bindInk();
    ScrollTrigger.refresh();
    return;
  }

  /* Circular arch. Ends rise a little; the middle rises more and is the crown. */
  function arch() {
    var first = letters[0];
    var last = letters[letters.length - 1];
    var left = first.offsetLeft;
    var right = last.offsetLeft + last.offsetWidth;
    var mid = (left + right) / 2;
    var half = Math.max(1, (right - left) / 2);
    var crown = half * 0.28;
    var foot = half * 0.05;
    var H = crown - foot;
    var cy = (half * half - H * H) / (2 * H);
    var radius = H + cy;
    letters.forEach(function (el) {
      var u = el.offsetLeft + el.offsetWidth / 2 - mid;
      var x = Math.max(-half, Math.min(half, u));
      var y = cy - Math.sqrt(Math.max(0, radius * radius - x * x)) - foot;
      var rotation = Math.atan2(x, cy - (y + foot)) * (180 / Math.PI);
      el._arch = { y: y * 0.25 - 20, rotation: rotation * 0.25 };
    });
  }

  arch();

  var tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero-c',
      start: 'top top',
      end: '+=100%',
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      onRefreshInit: arch
    }
  });

  large.forEach(function (el) {
    tl.fromTo(el, { y: 0 }, { y: '-72vh', ease: 'none' }, 0);
  });

  if (mist) {
    tl.fromTo(mist, { y: 0, scale: 1 }, { y: '-4vh', scale: 1.15, ease: 'none' }, 0);
  }

  letters.forEach(function (el) {
    tl.fromTo(
      el,
      { y: 0, rotation: 0 },
      {
        y: function () { return el._arch.y; },
        rotation: function () { return el._arch.rotation; },
        ease: 'none'
      },
      0
    );
  });

  function bindScrub(section) {
    var frame = section && section.querySelector('.plate__frame--scrub');
    if (!frame || reduce || typeof createImageBitmap !== 'function') return;
    var count = parseInt(frame.getAttribute('data-frames'), 10) || 0;
    var base = frame.getAttribute('data-base');
    var canvas = frame.querySelector('.plate__canvas');
    var still = frame.querySelector('.plate__still');
    if (!canvas || !count || !base) return;
    var ctx = canvas.getContext('2d', { alpha: false });
    var bitmaps = {};
    var pending = {};
    var painted = -1;
    var want = 0;
    var busy = false;

    function url(i) {
      return base + String(i + 1).padStart(3, '0') + '.webp';
    }

    function release(center) {
      Object.keys(bitmaps).forEach(function (key) {
        var n = +key;
        if (Math.abs(n - center) > 4) {
          if (bitmaps[n].close) bitmaps[n].close();
          delete bitmaps[n];
        }
      });
    }

    function load(i) {
      if (bitmaps[i]) return Promise.resolve(bitmaps[i]);
      if (pending[i]) return pending[i];
      pending[i] = fetch(url(i))
        .then(function (res) { return res.blob(); })
        .then(function (blob) { return createImageBitmap(blob); })
        .then(function (bmp) {
          delete pending[i];
          bitmaps[i] = bmp;
          return bmp;
        })
        .catch(function () {
          delete pending[i];
          return null;
        });
      return pending[i];
    }

    function paint(bmp) {
      if (canvas.width !== bmp.width || canvas.height !== bmp.height) {
        canvas.width = bmp.width;
        canvas.height = bmp.height;
      }
      ctx.drawImage(bmp, 0, 0);
      canvas.hidden = false;
      if (still) still.hidden = true;
    }

    function warm(center) {
      var d;
      for (d = -1; d <= 3; d++) {
        var n = center + d;
        if (n >= 0 && n < count) load(n);
      }
      release(center);
    }

    function show(i) {
      i = Math.max(0, Math.min(count - 1, i));
      want = i;
      if (i === painted) return;
      if (bitmaps[i]) {
        paint(bitmaps[i]);
        painted = i;
        warm(i);
        return;
      }
      if (busy) return;
      busy = true;
      var target = i;
      load(target).then(function (bmp) {
        busy = false;
        if (!bmp) return;
        if (want === target) {
          paint(bmp);
          painted = target;
          warm(want);
        } else {
          show(want);
        }
      });
    }

    var shown = 0;
    var goal = 0;
    var last = count - 1;
    var soften = gsap.parseEase('power1.inOut');

    gsap.ticker.add(function () {
      var gap = goal - shown;
      if (Math.abs(gap) < 0.15) shown = goal;
      else shown += gap * 0.08;
      show(Math.round(shown));
    });

    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=22%',
      pin: true,
      anticipatePin: 0,
      invalidateOnRefresh: true
    });

    ScrollTrigger.create({
      trigger: section,
      start: 'top 140%',
      end: 'bottom -60%',
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        goal = soften(self.progress) * last;
      }
    });

    requestAnimationFrame(function () { warm(0); });
  }

  function bindTumbler() {
    document.querySelectorAll('.shop-scrub').forEach(bindScrub);
  }

  bindSettle();
  bindHold();
  bindReading();
  bindInk();
  bindTumbler();
  ScrollTrigger.refresh();
})();
