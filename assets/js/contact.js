/* Behaviour for the contact page: smooth scroll, form handling and submission.
   Loaded at the end of <body>, in the place the inline script used to be. */

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false
    });
    window.lenis = lenis;
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

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

    // ── Title highlight sweep
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
      function onScroll() { if (!ticking) { requestAnimationFrame(update); ticking = true; } }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      update();
    })();

    // ── Back to top
    document.getElementById('back-top')?.addEventListener('click', (e) => {
      e.preventDefault();
      lenis.scrollTo(0, { duration: 1.5 });
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

    // ── Contact path toggle
    (function () {
      const options = document.querySelectorAll('.contact-option');
      const panels = document.querySelectorAll('.contact-panel');
      const hero = document.querySelector('.contact-hero');
      if (!options.length || !panels.length) return;

      const titleEl = hero?.querySelector('.contact-hero-title');

      function lockTitleHeight() {
        if (!titleEl || titleEl.dataset.locked === '1') return;
        titleEl.style.minHeight = titleEl.getBoundingClientRect().height + 'px';
        titleEl.dataset.locked = '1';
      }

      function unlockTitleHeight() {
        if (!titleEl) return;
        titleEl.style.minHeight = '';
        delete titleEl.dataset.locked;
      }

      function tabScrollOffset() {
        const nav = document.querySelector('.nav');
        const navH = nav ? nav.getBoundingClientRect().height : 0;
        return -(navH + 12);
      }

      function scrollToEl(el, offset) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (typeof lenis !== 'undefined') {
              lenis.scrollTo(el, { offset: offset, duration: 1.35 });
            } else {
              const y = window.scrollY + el.getBoundingClientRect().top + offset;
              window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
            }
          });
        });
      }

      options.forEach(opt => {
        opt.addEventListener('click', () => {
          const target = opt.dataset.target;
          const wasActive = opt.classList.contains('is-active');
          const panel = document.querySelector(`.contact-panel[data-panel="${target}"]`);
          options.forEach(o => {
            const isActive = !wasActive && o === opt;
            o.classList.toggle('is-active', isActive);
            o.setAttribute('aria-selected', isActive ? 'true' : 'false');
          });
          if (!wasActive) {
            lockTitleHeight();
            hero?.classList.add('is-open');
            panels.forEach(p => {
              p.classList.toggle('is-active', p.dataset.panel === target);
            });
            const facts = document.querySelector('.contact-hero .studio-meta-grid');
            if (facts) scrollToEl(facts, tabScrollOffset());
          } else {
            panels.forEach(p => p.classList.remove('is-active'));
            hero?.classList.remove('is-open');
            unlockTitleHeight();
            if (hero) scrollToEl(hero, 0);
          }
        });
      });

      const hash = (location.hash || '').replace('#', '');
      if (hash === 'book' || hash === 'call') {
        document.querySelector('.contact-option[data-target="book"]:not(.is-active)')?.click();
      } else if (hash === 'quiz') {
        document.querySelector('.contact-option[data-target="quiz"]:not(.is-active)')?.click();
      } else if (hash === 'message' || hash === 'form') {
        document.querySelector('.contact-option[data-target="work"]:not(.is-active)')?.click();
      }
    })();

    document.addEventListener('DOMContentLoaded', () => {
      const form = document.getElementById('contact-form');
      const emailInput = document.getElementById('email');
      const emailHelper = document.getElementById('email-helper');
      const chipGroup = document.getElementById('service-chips');
      const submitBtn = document.getElementById('submit-btn');
      const submitLabel = submitBtn && submitBtn.querySelector('.btn-primary-label');
      const feedback = document.getElementById('form-feedback');
      const websiteRow = document.getElementById('rowWebsite');
      if (!form || !emailInput || !emailHelper || !chipGroup || !submitBtn || !submitLabel || !feedback) return;

      const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'protonmail.com'];
      const serviceKeys = ['design-build', 'creative-content', 'growth-performance'];
      const selectedServices = new Set();
      const HS_SEND_MARKETING_OPT_IN = true;

      const optInInput = HS_SEND_MARKETING_OPT_IN ? mountMarketingOptIn() : null;
      function mountMarketingOptIn() {
        const tpl = document.getElementById('marketingOptInTemplate');
        if (!tpl) return null;
        feedback.before(tpl.content.cloneNode(true));
        return document.getElementById('marketingOptIn');
      }

      chipGroup.addEventListener('click', (e) => {
        const chip = e.target.closest('.contact-chip');
        if (!chip || !chipGroup.contains(chip)) return;
        const value = chip.dataset.value;
        if (selectedServices.has(value)) {
          selectedServices.delete(value);
          chip.classList.remove('is-selected');
          chip.setAttribute('aria-pressed', 'false');
        } else {
          selectedServices.add(value);
          chip.classList.add('is-selected');
          chip.setAttribute('aria-pressed', 'true');
        }
        document.getElementById('rowServices')?.classList.remove('is-invalid');
      });

      emailInput.addEventListener('input', () => {
        const email = emailInput.value.trim().toLowerCase();
        const domain = email.split('@')[1];
        const generic = !!(domain && genericDomains.includes(domain));
        emailHelper.classList.toggle('hidden', !generic);
        websiteRow?.classList.toggle('is-nudged', generic);
      });

      function getCookie(name) {
        const m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'));
        return m ? decodeURIComponent(m[2]) : null;
      }

      function setLoading(loading) {
        submitBtn.disabled = loading;
        submitBtn.classList.toggle('is-loading', loading);
        submitLabel.textContent = loading ? 'Sending…' : 'Get Your Proposal';
      }

      (function prefillFromQuiz() {
        const service = new URLSearchParams(window.location.search).get('service');
        if (!service) return;
        const keys = service === 'multiple' ? serviceKeys : serviceKeys.filter((key) => key === service);
        keys.forEach((key) => {
          const chip = chipGroup.querySelector(`.contact-chip[data-service="${key}"]`);
          if (!chip) return;
          selectedServices.add(chip.dataset.value);
          chip.classList.add('is-selected');
          chip.setAttribute('aria-pressed', 'true');
        });
        document.querySelector('.contact-option[data-target="work"]:not(.is-active)')?.click();
      })();

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        feedback.classList.add('hidden');
        feedback.className = 'form-feedback hidden';

        const fullName = document.getElementById('fullName').value.trim();
        const email = emailInput.value.trim();
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const nameOk = fullName.length > 1;
        const servicesOk = selectedServices.size > 0;
        document.getElementById('rowFullName')?.classList.toggle('is-invalid', !nameOk);
        document.getElementById('rowEmail')?.classList.toggle('is-invalid', !emailOk);
        document.getElementById('rowServices')?.classList.toggle('is-invalid', !servicesOk);
        if (!nameOk || !emailOk || !servicesOk) return;

        setLoading(true);

        const urlParams = new URLSearchParams(window.location.search);
        const hasMarketingConsent = !!(window.fhConsent && window.fhConsent.has('marketing'));

        const payload = {
          fullName,
          email,
          website: document.getElementById('website').value.trim(),
          services: Array.from(selectedServices),
          budget: document.getElementById('budget').value,
          utm_source: urlParams.get('utm_source') || '',
          utm_medium: urlParams.get('utm_medium') || '',
          utm_campaign: urlParams.get('utm_campaign') || '',
          gclid: urlParams.get('gclid') || '',
          hp_website: (form.hp_website && form.hp_website.value) || '',
          marketingOptIn: !!(optInInput && optInInput.checked),
          processingText: (document.getElementById('formLegal')?.textContent || '').replace(/\s+/g, ' ').trim(),
          optInText: optInInput && optInInput.labels[0] ? optInInput.labels[0].textContent.trim() : '',
          pageUri: window.location.href,
          pageName: document.title,
          hutk: hasMarketingConsent ? getCookie('hubspotutk') : ''
        };

        try {
          const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            form.reset();
            selectedServices.clear();
            document.querySelectorAll('.contact-chip').forEach((c) => {
              c.classList.remove('is-selected');
              c.setAttribute('aria-pressed', 'false');
            });
            emailHelper.classList.add('hidden');
            websiteRow?.classList.remove('is-nudged');
            feedback.textContent = "Thank you! We've received your request and will follow up within 24 hours.";
            feedback.className = 'form-feedback success';
          } else {
            throw new Error('Submission failed');
          }
        } catch (err) {
          feedback.innerHTML = 'Something went wrong. Please email <a href="mailto:hello@funnelhaus.ca">hello@funnelhaus.ca</a> directly.';
          feedback.className = 'form-feedback error';
        } finally {
          setLoading(false);
          feedback.classList.remove('hidden');
        }
      });
    });
  
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

  
