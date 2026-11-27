/* Behaviour for the find-your-fit page: smooth scroll and the quiz/steps.
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

    // ─── QUIZ ───────────────────────────────────────────────────────
    // Questions are asked in order. A question with `showIf` is only asked when the answers so far match it.
    // Options with `scores` add points to pillars: db = Design & Build, cc = Creative & Content,
    // gp = Growth & Performance. `exclusive` options (e.g. "Not sure yet") clear the other picks.
    // Edit `questions` to add, remove or reword. Keep the whole quiz to about three minutes.
    const PILLAR_SERVICE = { db: 'design-build', cc: 'creative-content', gp: 'growth-performance' };

    function selectedValues(answers, id) {
      const q = quiz.questions.find(x => x.id === id);
      if (!q) return [];
      return (answers[id] || []).map(i => q.options[i] && q.options[i].value).filter(Boolean);
    }

    const quiz = {
      currentId: null,
      answers: {},   // question id -> array of selected option indexes

      questions: [
        {
          id: 'industry',
          title: 'What kind of business are you in?',
          options: [
            { label: 'Construction',               value: 'construction',  scores: {} },
            { label: 'Trades or field service',    value: 'trades',        scores: {} },
            { label: 'Professional services',      value: 'professional',  scores: {} },
            { label: 'Retail or e-commerce',       value: 'retail',        scores: {} },
            { label: 'Something else',             value: 'other',         scores: {} }
          ]
        },
        {
          id: 'goals',
          title: 'What would you most like help with?',
          multi: true,
          maxSelect: 3,
          helper: 'Choose up to 3.',
          options: [
            { label: 'A new website or a redesign',              value: 'website',   scores: { db: 2 } },
            { label: 'Lead forms, booking or a sales funnel',    value: 'forms',     scores: { gp: 2 } },
            { label: 'An AI chatbot or AI calling agent',        value: 'ai',        scores: { db: 2 } },
            { label: 'Showing up on Google (SEO)',               value: 'seo',       scores: { gp: 2 } },
            { label: 'Ads, social, photo or video',              value: 'content',   scores: { cc: 2 } },
            { label: 'Analytics and tracking',                   value: 'analytics', scores: { gp: 1 } },
            { label: 'Not sure yet',                             value: 'unsure',    scores: {}, exclusive: true }
          ]
        },
        {
          id: 'platform',
          title: 'Which platform is your website on, or the one you would want?',
          showIf: a => selectedValues(a, 'goals').includes('website'),
          options: [
            { label: 'Shopify',                      value: 'shopify',          scores: {} },
            { label: 'WordPress',                    value: 'wordpress',        scores: {} },
            { label: 'Squarespace or Wix',           value: 'squarespace-wix',  scores: {} },
            { label: 'Custom-built',                 value: 'custom',           scores: {} },
            { label: 'I have no website yet',        value: 'none',             scores: {} },
            { label: 'Open to advice',               value: 'advice',           scores: {} }
          ]
        },
        {
          id: 'ai',
          title: 'What would you want AI to do?',
          multi: true,
          maxSelect: 2,
          helper: 'Choose up to 2.',
          showIf: a => selectedValues(a, 'goals').includes('ai'),
          options: [
            { label: 'Answer visitor questions on my website (chatbot)', value: 'chatbot',  scores: {} },
            { label: 'Call or book leads (AI calling agent)',            value: 'calling',  scores: {} },
            { label: 'Write or repurpose content',                       value: 'content',  scores: {} },
            { label: 'Automate work inside my team',                     value: 'internal', scores: {} },
            { label: 'Not sure, I want advice',                          value: 'advice',   scores: {}, exclusive: true }
          ]
        },
        {
          id: 'leads',
          title: 'Where do your leads and bookings go today?',
          options: [
            { label: 'A general CRM (HubSpot, Salesforce, Microsoft Dynamics)',                              value: 'general-crm',  scores: {} },
            { label: 'Construction or trades software (Buildertrend, Procore, JobTread, Jobber, ServiceTitan)', value: 'industry-crm', scores: {} },
            { label: 'Another tool',                                                                          value: 'other-tool',   scores: {} },
            { label: 'Email or a spreadsheet',                                                                value: 'email-sheet',  scores: {} },
            { label: 'Not sure, help me choose',                                                              value: 'unsure',       scores: {} }
          ]
        },
        {
          id: 'timeline',
          title: 'When would you like to start?',
          options: [
            { label: 'This month',       value: 'now',        scores: {} },
            { label: 'In 1 to 3 months', value: '1-3-months', scores: {} },
            { label: 'In 3 to 6 months', value: '3-6-months', scores: {} },
            { label: 'Just exploring',   value: 'exploring',  scores: {} }
          ]
        },
        {
          id: 'budget',
          title: 'Which range feels right for this project?',
          options: [
            { label: 'Less than $5k',  value: '<5k',   scores: {} },
            { label: '$5k to $7k',     value: '5-7k',  scores: {} },
            { label: '$7k to $10k',    value: '7-10k', scores: {} },
            { label: '$10k to $15k',   value: '10-15k', scores: {} },
            { label: '$15k to $20k',   value: '15-20k', scores: {} },
            { label: 'More than $20k', value: '20k+',  scores: {} },
            { label: 'Not sure yet',   value: '',      scores: {} }
          ]
        }
      ],

      results: {
        db: {
          eyebrow: "Pillar one · Design & Build",
          lede: "Based on what you shared, it sounds like your foundation and messaging could use some clarity before focusing on growth.",
          name: "Design & Build",
          desc: "Websites and digital experiences designed to scale with clarity and conversion in mind.",
          link: "design-and-build.html",
          serviceParam: "design-build"
        },
        cc: {
          eyebrow: "Pillar two · Creative & Content",
          lede: "Based on what you shared, the clearest opportunity is sharpening your story and content so your brand connects and converts.",
          name: "Creative & Content",
          desc: "Photography, film, and campaigns that bring your brand to life and support the funnel.",
          link: "creative-and-content.html",
          serviceParam: "creative-content"
        },
        gp: {
          eyebrow: "Pillar three · Growth & Performance",
          lede: "Based on what you shared, the fastest path is measurement and optimization so you can see what's working and improve from there.",
          name: "Growth & Performance",
          desc: "SEO, analytics, and CRO that turn the funnel into a measurable engine.",
          link: "growth-and-performance.html",
          serviceParam: "growth-performance"
        },
        talk: {
          eyebrow: "Let's talk",
          lede: "Hard to say from here — let's hop on a call. The right starting point usually becomes clear in 15 minutes of conversation, especially when there's more than one issue in play.",
          name: "Open a conversation",
          desc: "Tell us a bit about what's going on and we'll suggest where to start. No proposal, no pressure — just a 45-minute conversation between humans.",
          link: "contact.html#form",
          serviceParam: "multiple"
        }
      },

      init() {
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());
        document.getElementById('nextBtn').addEventListener('click', () => this.goNext());
        document.getElementById('restartBtn').addEventListener('click', () => this.showIntro());
        document.getElementById('quizForm').addEventListener('submit', (e) => {
          e.preventDefault();
          this.submitContact();
        });
      },

      // The questions asked for the answers given so far
      active() {
        return this.questions.filter(q => !q.showIf || q.showIf(this.answers));
      },

      start() {
        this.answers = {};
        this.showQuestion(this.active()[0].id);
      },

      showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('is-active'));
        document.getElementById(id).classList.add('is-active');
      },

      updateTopbar(showBack, eyebrowText) {
        document.getElementById('topbarEyebrow').textContent = eyebrowText;
        document.getElementById('backBtn').style.visibility = showBack ? 'visible' : 'hidden';
      },

      updateProgress(pct) {
        const bar = document.getElementById('progress');
        const fill = document.getElementById('progressFill');
        if (pct === null) {
          bar.classList.remove('is-shown');
        } else {
          bar.classList.add('is-shown');
          fill.style.width = pct + '%';
        }
      },

      showQuestion(id) {
        const list = this.active();
        const idx = list.findIndex(q => q.id === id);
        const q = list[idx];
        this.currentId = id;
        if (!Array.isArray(this.answers[id])) this.answers[id] = [];

        // The contact step counts as one more step at the end
        this.updateProgress(((idx + 1) / (list.length + 1)) * 100);
        this.updateTopbar(true, `Question ${idx + 1} of ${list.length}`);

        document.getElementById('qTitle').textContent = q.title;

        const helperEl = document.getElementById('qHelper');
        if (q.helper) {
          helperEl.textContent = q.helper;
          helperEl.style.display = '';
        } else {
          helperEl.style.display = 'none';
        }

        const optionsEl = document.getElementById('qOptions');
        optionsEl.innerHTML = '';
        optionsEl.classList.toggle('is-multi', !!q.multi);

        q.options.forEach((opt, optIdx) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'q-option';
          const indicatorClass = q.multi ? 'checkbox' : 'radio';
          btn.innerHTML = `<span class="${indicatorClass}"></span><span class="label"></span>`;
          btn.querySelector('.label').textContent = opt.label;
          btn.addEventListener('click', () => this.selectOption(optIdx));
          optionsEl.appendChild(btn);
        });

        this.renderOptionStates();
        document.getElementById('nextLabel').textContent = idx === list.length - 1 ? 'Continue' : 'Next';
        this.updateNextBtn();

        this.showScreen('screen-question');
        lenis.scrollTo(0, { duration: 0.6 });
      },

      selectOption(optIdx) {
        const q = this.questions.find(x => x.id === this.currentId);
        const cur = this.answers[q.id] || [];
        const opt = q.options[optIdx];

        if (q.multi) {
          if (cur.includes(optIdx)) {
            this.answers[q.id] = cur.filter(i => i !== optIdx);
          } else if (opt.exclusive) {
            this.answers[q.id] = [optIdx];
          } else {
            const others = cur.filter(i => !q.options[i].exclusive);
            if (others.length >= (q.maxSelect || Infinity)) return;  // at cap, ignore click
            this.answers[q.id] = [...others, optIdx];
          }
        } else {
          this.answers[q.id] = [optIdx];
        }

        this.renderOptionStates();
        this.updateNextBtn();
      },

      renderOptionStates() {
        const q = this.questions.find(x => x.id === this.currentId);
        const selected = this.answers[q.id] || [];
        const optionsEl = document.getElementById('qOptions');
        document.querySelectorAll('.q-option').forEach((el, i) => {
          el.classList.toggle('is-selected', selected.includes(i));
        });
        optionsEl.classList.toggle('is-maxed', !!q.multi && selected.length >= (q.maxSelect || Infinity));
      },

      updateNextBtn() {
        const hasAnswer = (this.answers[this.currentId] || []).length > 0;
        document.getElementById('nextBtn').setAttribute('aria-disabled', hasAnswer ? 'false' : 'true');
      },

      goNext() {
        if (!(this.answers[this.currentId] || []).length) return;
        const list = this.active();
        const idx = list.findIndex(q => q.id === this.currentId);
        if (idx < list.length - 1) {
          this.showQuestion(list[idx + 1].id);
        } else {
          this.showContact();
        }
      },

      goBack() {
        const current = document.querySelector('.screen.is-active').id;
        const list = this.active();
        if (current === 'screen-contact') {
          this.showQuestion(list[list.length - 1].id);
          return;
        }
        const idx = list.findIndex(q => q.id === this.currentId);
        if (idx <= 0) this.showIntro();
        else this.showQuestion(list[idx - 1].id);
      },

      showIntro() {
        this.updateProgress(null);
        this.updateTopbar(false, 'Find your fit');
        this.showScreen('screen-intro');
        lenis.scrollTo(0, { duration: 0.6 });
      },

      showContact() {
        this.updateProgress(100);
        this.updateTopbar(true, 'Almost there');
        this.showScreen('screen-contact');
        lenis.scrollTo(0, { duration: 0.6 });
      },

      score() {
        const scores = { db: 0, cc: 0, gp: 0 };
        this.active().forEach(q => {
          (this.answers[q.id] || []).forEach(i => {
            Object.entries(q.options[i].scores).forEach(([pillar, pts]) => {
              scores[pillar] += pts;
            });
          });
        });
        return scores;
      },

      recommend(scores) {
        const total = scores.db + scores.cc + scores.gp;
        if (total === 0) return 'talk';
        const order = { db: 0, cc: 1, gp: 2 };   // tie-break: db, then cc, then gp
        return Object.entries(scores).sort((a, b) => (b[1] - a[1]) || (order[a[0]] - order[b[0]]))[0][0];
      },

      setError(message) {
        const el = document.getElementById('quizError');
        el.textContent = message;
        el.hidden = !message;
      },

      validate(form) {
        const fields = [
          { el: form.fullName, ok: form.fullName.value.trim().length > 0 },
          { el: form.email,    ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim()) },
          { el: form.company,  ok: form.company.value.trim().length > 0 }
        ];
        let first = null;
        fields.forEach(({ el, ok }) => {
          el.closest('.quiz-field').classList.toggle('is-invalid', !ok);
          if (!ok && !first) first = el;
        });
        if (first) {
          this.setError('Please fill in your name, a valid email and your company.');
          first.focus();
          return false;
        }
        this.setError('');
        return true;
      },

      payload(form) {
        const scores = this.score();
        const pick = id => selectedValues(this.answers, id);
        return {
          fullName: form.fullName.value.trim(),
          email: form.email.value.trim(),
          company: form.company.value.trim(),
          website: form.website.value.trim(),
          services: Object.keys(scores).filter(p => scores[p] > 0).map(p => PILLAR_SERVICE[p]),
          budget: pick('budget')[0] || '',
          hp_website: form.hp_website.value,
          pageUri: location.href,
          pageName: 'Find your fit quiz - FunnelHaus',
          quiz: {
            industry: pick('industry')[0] || '',
            goals: pick('goals'),
            platform: pick('platform')[0] || '',
            aiUses: pick('ai'),
            leadTools: pick('leads')[0] || '',
            timeline: pick('timeline')[0] || '',
            recommended: this.recommend(scores),
            message: form.message.value.trim()
          }
        };
      },

      async submitContact() {
        const form = document.getElementById('quizForm');
        if (!this.validate(form)) return;

        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        try {
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.payload(form))
          });
          if (!res.ok) {
            // 429 (too many tries) has a message written for people; other errors get a plain one
            const data = res.status === 429 ? await res.json().catch(() => ({})) : {};
            throw new Error(data.error || 'We could not send your details just now.');
          }
          this.showResult(this.recommend(this.score()));
        } catch (err) {
          this.setError((err && err.message ? err.message : 'Something went wrong.') +
            ' You can also email hello@funnelhaus.ca.');
        } finally {
          btn.disabled = false;
        }
      },

      showResult(pillar) {
        const r = this.results[pillar];
        document.getElementById('resultCardEyebrow').textContent = r.eyebrow;
        document.getElementById('resultLede').textContent = r.lede;
        document.getElementById('resultCardName').textContent = r.name;
        document.getElementById('resultCardDesc').textContent = r.desc;
        document.getElementById('resultCard').setAttribute('data-pillar', pillar);

        const cardLink = document.getElementById('resultCardLink');
        cardLink.href = r.link;
        cardLink.querySelector('span').textContent = pillar === 'talk' ? 'Open a conversation' : 'View capability';

        const startProjectBtn = document.getElementById('startProjectBtn');
        startProjectBtn.href = r.serviceParam ? `contact.html?service=${r.serviceParam}#form` : 'contact.html#form';

        this.updateProgress(null);
        this.updateTopbar(false, 'Your fit');
        this.showScreen('screen-result');
        lenis.scrollTo(0, { duration: 0.6 });
      },
    };

    quiz.init();
  
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

  
