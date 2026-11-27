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

    // ─── QUIZ STATE MACHINE ─────────────────────────────────────────
    // Edit `questions` to add/remove/reword. Each option awards points to
    // pillars: db = Design & Build, cc = Creative & Content, gp = Growth
    // & Performance. Empty scores object = neutral (counts toward the
    // "let's talk" fallback if all answers are neutral).
    const quiz = {
      step: 'intro',  // 'intro' | 'q0' | 'q1' | 'q2' | 'result'
      currentQ: 0,
      answers: [],
      scores: { db: 0, cc: 0, gp: 0 },

      questions: [
        {
          title: "Which of these feels closest to where you're at?",
          options: [
            { label: "I'm starting something new",                            scores: { db: 2, cc: 1 } },
            { label: "I have a website, but it's not working",                 scores: { db: 1, gp: 2 } },
            { label: "I'm growing and things feel disconnected",               scores: { cc: 2 } },
            { label: "I'm not sure — I just know something needs fixing",     scores: {} }
          ]
        },
        {
          title: "What's the main challenge you're dealing with?",
          options: [
            { label: "My website doesn't reflect my business",                  scores: { db: 2 } },
            { label: "I'm not getting enough leads or conversions",             scores: { gp: 2 } },
            { label: "My brand or content feels unclear",                       scores: { cc: 2 } },
            { label: "I don't know what's working or what to focus on",         scores: {} }
          ]
        },
        {
          // Multi-select with cap. Each pick adds points (halved vs Q1/Q2
          // so multi-pick can't dominate clear single answers).
          title: "What would \"working better\" look like?",
          multi: true,
          maxSelect: 3,
          helper: "Choose up to 3.",
          options: [
            { label: "A clearer website and message",       scores: { db: 0.5, cc: 0.5 } },
            { label: "Stronger conversions",                 scores: { gp: 1, db: 0.5 } },
            { label: "Better brand presence",                scores: { cc: 1 } },
            { label: "Clearer insight into performance",     scores: { gp: 1 } },
            { label: "Confidence in what to do next",        scores: {} }
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
        document.getElementById('startBtn').addEventListener('click', () => this.startQuiz());
        document.getElementById('backBtn').addEventListener('click', () => this.goBack());
        document.getElementById('nextBtn').addEventListener('click', () => this.goNext());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
      },

      startQuiz() {
        this.currentQ = 0;
        this.answers = [];
        this.scores = { db: 0, cc: 0, gp: 0 };
        this.showQuestion();
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

      showQuestion() {
        const i = this.currentQ;
        const q = this.questions[i];
        const total = this.questions.length;
        const pct = ((i + 1) / total) * 100;

        // Ensure answer slot is always an array
        if (!Array.isArray(this.answers[i])) this.answers[i] = [];

        this.updateProgress(pct);
        this.updateTopbar(true, `Question ${i + 1} of ${total}`);

        document.getElementById('qTitle').textContent = q.title;

        // Helper text (e.g. "Choose up to 3.")
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
          btn.addEventListener('click', () => this.selectOption(i, optIdx));
          optionsEl.appendChild(btn);
        });

        this.renderOptionStates(i);

        const isLast = i === total - 1;
        document.getElementById('nextLabel').textContent = isLast ? 'See result' : 'Next';

        this.updateNextBtn();

        this.showScreen('screen-question');
        lenis.scrollTo(0, { duration: 0.6 });
      },

      selectOption(qIdx, optIdx) {
        const q = this.questions[qIdx];
        const current = this.answers[qIdx] || [];

        if (q.multi) {
          const isSelected = current.includes(optIdx);
          if (isSelected) {
            this.answers[qIdx] = current.filter(i => i !== optIdx);
          } else {
            const max = q.maxSelect || Infinity;
            if (current.length >= max) return;  // at cap, ignore click
            this.answers[qIdx] = [...current, optIdx];
          }
        } else {
          this.answers[qIdx] = [optIdx];
        }

        this.renderOptionStates(qIdx);
        this.updateNextBtn();
      },

      renderOptionStates(qIdx) {
        const q = this.questions[qIdx];
        const selected = this.answers[qIdx] || [];
        const optionsEl = document.getElementById('qOptions');
        document.querySelectorAll('.q-option').forEach((el, i) => {
          el.classList.toggle('is-selected', selected.includes(i));
        });
        if (q.multi) {
          const max = q.maxSelect || Infinity;
          optionsEl.classList.toggle('is-maxed', selected.length >= max);
        } else {
          optionsEl.classList.remove('is-maxed');
        }
      },

      updateNextBtn() {
        const selected = this.answers[this.currentQ] || [];
        const hasAnswer = selected.length > 0;
        document.getElementById('nextBtn').setAttribute('aria-disabled', hasAnswer ? 'false' : 'true');
      },

      goNext() {
        const selected = this.answers[this.currentQ] || [];
        if (selected.length === 0) return;
        if (this.currentQ < this.questions.length - 1) {
          this.currentQ++;
          this.showQuestion();
        } else {
          this.computeAndShowResult();
        }
      },

      goBack() {
        if (this.currentQ === 0) {
          this.showIntro();
        } else {
          this.currentQ--;
          this.showQuestion();
        }
      },

      showIntro() {
        this.updateProgress(null);
        this.updateTopbar(false, 'Find your fit');
        this.showScreen('screen-intro');
        lenis.scrollTo(0, { duration: 0.6 });
      },

      computeAndShowResult() {
        this.scores = { db: 0, cc: 0, gp: 0 };
        this.answers.forEach((selected, qIdx) => {
          if (!Array.isArray(selected)) return;
          const opts = this.questions[qIdx].options;
          selected.forEach(optIdx => {
            const opt = opts[optIdx];
            if (!opt) return;
            Object.entries(opt.scores).forEach(([pillar, pts]) => {
              this.scores[pillar] = (this.scores[pillar] || 0) + pts;
            });
          });
        });

        const total = this.scores.db + this.scores.cc + this.scores.gp;
        let winner;
        if (total === 0) {
          winner = 'talk';
        } else {
          // Tie-break: db > cc > gp
          const sorted = Object.entries(this.scores).sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1];
            const order = { db: 0, cc: 1, gp: 2 };
            return order[a[0]] - order[b[0]];
          });
          winner = sorted[0][0];
        }

        this.showResult(winner);
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

        // Pre-fill service in contact form via URL param
        const startProjectBtn = document.getElementById('startProjectBtn');
        if (r.serviceParam) {
          startProjectBtn.href = `contact.html?service=${r.serviceParam}#form`;
        } else {
          startProjectBtn.href = 'contact.html#form';
        }

        this.updateProgress(null);
        this.updateTopbar(false, 'Your fit');
        this.showScreen('screen-result');
        lenis.scrollTo(0, { duration: 0.6 });
      },

      restart() {
        this.showIntro();
      }
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

  
