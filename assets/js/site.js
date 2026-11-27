/* Site-wide behaviour shared by most pages: Lenis smooth scroll, scroll reveals, nav and scroll cues.
   Loaded at the end of <body>, in the place the inline script used to be. */

    // ── Lenis smooth scroll
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    // ── Scroll reveals
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ── Word splitter (preserves inline tags like .ital)
    function splitWords(root, baseDelay = 0) {
      const stagger = 0.05;
      let i = 0;
      const wrapText = (text) => {
        return text.split(/(\s+)/).map(token => {
          if (/^\s+$/.test(token)) return token;
          if (!token) return '';
          const delay = (baseDelay + i * stagger).toFixed(3);
          i++;
          return `<span class="word-wrap"><span style="animation-delay:${delay}s">${token}</span></span>`;
        }).join('');
      };
      const walk = (node) => {
        Array.from(node.childNodes).forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            const wrapped = wrapText(child.textContent);
            const tmp = document.createElement('span');
            tmp.innerHTML = wrapped;
            const frag = document.createDocumentFragment();
            while (tmp.firstChild) frag.appendChild(tmp.firstChild);
            child.replaceWith(frag);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            if (child.classList && (child.classList.contains('line') || child.classList.contains('ital'))) {
              walk(child);
            } else {
              const inner = child.innerHTML;
              if (inner && /\S/.test(child.textContent)) {
                child.innerHTML = wrapText(inner);
              }
            }
          }
        });
      };
      walk(root);
    }
    const splitObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.split) {
          entry.target.dataset.split = '1';
          splitWords(entry.target, 0);
        }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('[data-split-on-scroll]').forEach(el => splitObserver.observe(el));

    // ── Title highlight sweep — scroll-tied; per-letter snap.
    // Walks text nodes only so nested <span class="ital"> structure is preserved.
    (function () {
      const highlightTargets = document.querySelectorAll('[data-highlight]');
      if (!highlightTargets.length) return;

      const letterMap = new Map();
      highlightTargets.forEach(el => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) textNodes.push(node);

        const letters = [];
        textNodes.forEach(tn => {
          const text = tn.textContent;
          if (!text) return;
          const frag = document.createDocumentFragment();
          for (const ch of text) {
            if (/\s/.test(ch)) {
              frag.appendChild(document.createTextNode(ch));
            } else {
              const span = document.createElement('span');
              span.className = 'ltr-hl';
              span.textContent = ch;
              frag.appendChild(span);
              letters.push(span);
            }
          }
          tn.replaceWith(frag);
        });
        letterMap.set(el, letters);
      });

      let ticking = false;
      function update() {
        const vh = window.innerHeight;
        highlightTargets.forEach(el => {
          const rect = el.getBoundingClientRect();
          const isSecondary = el.classList.contains('hl-secondary');
          const offset = isSecondary ? vh * 0.14 : 0;
          const startPx = vh * 1.0 - offset;
          const endPx = vh * 0.4 - offset;
          let progress = (startPx - rect.top) / (startPx - endPx);
          progress = Math.max(0, Math.min(1, progress));
          const letters = letterMap.get(el);
          if (!letters) return;
          const litCount = Math.round(progress * letters.length);
          letters.forEach((ltr, i) => {
            const shouldBeLit = i < litCount;
            if (ltr.classList.contains('lit') !== shouldBeLit) {
              ltr.classList.toggle('lit', shouldBeLit);
            }
          });
        });
        ticking = false;
      }
      function onScroll() {
        if (!ticking) { requestAnimationFrame(update); ticking = true; }
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      update();
    })();

    // ── Back to top
    document.getElementById('back-top')?.addEventListener('click', (e) => {
      e.preventDefault();
      lenis.scrollTo(0, { duration: 1.5 });
    });

    document.querySelectorAll('a[class*="scroll-cue"]').forEach((cue) => {
      cue.addEventListener('click', (e) => {
        const href = cue.getAttribute('href');
        if (!href || href.charAt(0) !== '#') return;
        const target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        if (typeof lenis !== 'undefined') {
          lenis.scrollTo(target, { duration: 1.35 });
        } else {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });


    // ── Capabilities dropdown
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
      function show() {
        clearTimeout(hideTimer);
        positionDropdown();
        dropdown.classList.add('is-open');
      }
      function hide() {
        hideTimer = setTimeout(() => dropdown.classList.remove('is-open'), 150);
      }

      li.addEventListener('mouseenter', show);
      li.addEventListener('mouseleave', hide);
      dropdown.addEventListener('mouseenter', show);
      dropdown.addEventListener('mouseleave', hide);
      trigger.addEventListener('focus', show);
      dropdown.addEventListener('focusout', (e) => {
        if (!dropdown.contains(e.relatedTarget) && e.relatedTarget !== trigger) hide();
      });
      window.addEventListener('resize', () => {
        if (dropdown.classList.contains('is-open')) positionDropdown();
      });
    })();
  
    // ── Mobile hamburger menu
    (function () {
      const hamburger = document.getElementById('navHamburger');
      const mobileMenu = document.getElementById('mobileMenu');
      if (!hamburger || !mobileMenu) return;

      function setOpen(isOpen) {
        hamburger.classList.toggle('is-open', isOpen);
        mobileMenu.classList.toggle('is-open', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
        mobileMenu.setAttribute('aria-hidden', String(!isOpen));
        var overlay = document.getElementById('mobileOverlay');
        if (overlay) overlay.classList.toggle('is-open', isOpen);
        document.documentElement.style.overflow = isOpen ? 'hidden' : '';
        if (typeof lenis !== 'undefined') {
          if (isOpen) lenis.stop(); else lenis.start();
        }
        if (!isOpen) {
          var ct = document.getElementById('capsToggle');
          var cs = document.getElementById('capsSubMenu');
          if (ct) ct.setAttribute('aria-expanded', 'false');
          if (cs) cs.classList.remove('is-open');
        }
      }

      hamburger.addEventListener('click', () => {
        setOpen(!hamburger.classList.contains('is-open'));
      });

      mobileMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => setOpen(false));
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && hamburger.classList.contains('is-open')) {
          setOpen(false);
        }
      });

      var overlay = document.getElementById('mobileOverlay');
      if (overlay) overlay.addEventListener('click', () => setOpen(false));
    })();

    // ── Capabilities accordion in mobile menu
    (function () {
      var capsToggle = document.getElementById('capsToggle');
      var capsSubMenu = document.getElementById('capsSubMenu');
      if (!capsToggle || !capsSubMenu) return;
      capsToggle.addEventListener('click', function () {
        var isOpen = capsToggle.getAttribute('aria-expanded') === 'true';
        capsToggle.setAttribute('aria-expanded', String(!isOpen));
        capsSubMenu.classList.toggle('is-open', !isOpen);
      });
    })();

  
