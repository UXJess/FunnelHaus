// The mountain frame of the hero (index.html). Same scene and motion as the first hero (_archive/white-frame-hero/main.js),
// but the cloud wipe cuts a hole in the scene (mask #hole) instead of painting a white frame, so the
// end frame fixed underneath shows through and takes over. The original white panel (.panel, mask #m)
// still covers the hole at the start, then fades as the wipe gets going. Selectors are scoped to main, since the
// end frames reuse names like .sky.
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)', () => {
  gsap
    .timeline({
      scrollTrigger: {
        trigger: '.scrollDist',
        start: '0 0',
        end: '100% 100%',
        scrub: 1
      }
    })
    .fromTo('main .sky', { y: 0 }, { y: -200 }, 0)
    .fromTo('main .cloud1', { y: 100 }, { y: -870 }, 0) // extra -70 offsets the scene's shift down
    .fromTo('main .cloud2', { y: -150 }, { y: -500 }, 0)
    .fromTo('main .cloud3', { y: -50 }, { y: -650 }, 0)
    .fromTo('main .mountBg', { y: -10 }, { y: -100 }, 0)
    .fromTo('main .mountMg', { y: -30 }, { y: -250 }, 0)
    .fromTo('main .mountFg', { y: -50 }, { y: -600 }, 0)
    // The tweens above use GSAP's default 0.5s, so the timeline is 0.5 long; these fit inside it
    .to('#arrow-btn', { autoAlpha: 0, duration: 0.025 }, 0.125)    // gone a quarter of the way in, before the clouds reach it
    .to('main .panel', { opacity: 0, duration: 0.175 }, 0.1);      // 20-55% of the way: white behind the cloud gives way to the end frame

  // The scroll cue's arrow bobs gently (icon units: 5 of 40, about 2.5px on screen)
  gsap.to('#arrow-btn .arrow', { y: 5, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1 });
});

// Reduced motion: no scrubbed wipe. Past the first half of the scroll, simply swap to the end frame.
mm.add('(prefers-reduced-motion: reduce)', () => {
  ScrollTrigger.create({
    trigger: '.scrollDist',
    start: '50% 0',
    toggleClass: { targets: 'body', className: 'show-end' }
  });
});

const scene = document.querySelector('.scene');
const headlines = document.querySelectorAll('.headline');
const lead = document.querySelector('.lead');
const arrowBtn = document.querySelector('#arrow-btn');

// Scale a set of text nodes together so the widest line fits `room`.
// With `byLine`, each tspan counts as its own line.
function fitText(nodes, max, room, byLine = false) {
  nodes.forEach((t) => t.style.fontSize = `${max}px`);
  const lines = [...nodes].flatMap((t) => byLine ? [...t.querySelectorAll('tspan')] : [t]);
  const widest = Math.max(...lines.map((l) => l.getComputedTextLength()));
  const size = Math.min(max, (max * room) / widest);
  nodes.forEach((t) => t.style.fontSize = `${size}px`);
}

// The art is 1200x800. On screens taller than that ratio (phones), crop the
// sides so the scene fills the full height, then shrink the words to fit.
function fitScene() {
  const box = scene.getBoundingClientRect();
  if (!box.width || !box.height) return; // not laid out yet (hidden tab); resize runs it again
  const w = Math.min(1200, (800 * box.width) / box.height);
  scene.setAttribute('viewBox', `${600 - w / 2} 0 ${w} 800`);

  // Lead runs two lines on wide screens, three on narrow ones
  const stacked = w < 900;
  const leadLines = lead.dataset[stacked ? 'narrow' : 'wide'].split('|');
  lead.replaceChildren(...leadLines.map((line, i) => {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    t.setAttribute('x', 600);
    if (i) t.setAttribute('dy', '1em');
    t.textContent = line;
    return t;
  }));

  fitText(headlines, 99, w * 0.86);
  const head = parseFloat(headlines[0].style.fontSize);
  fitText([lead], head * 0.82, w * 0.86, true);
  const leadSize = parseFloat(lead.style.fontSize);

  // Stack: lead lines, then the big word
  const top = stacked ? 110 : 104;
  lead.setAttribute('y', top);
  const headY = top + (leadLines.length - 1) * leadSize + head;
  headlines.forEach((t) => t.setAttribute('y', headY));
}

fitScene();
document.fonts.ready.then(fitScene);
addEventListener('resize', fitScene);

arrowBtn.addEventListener('click', () => {
  gsap.to(window, { scrollTo: innerHeight, duration: reduceMotion ? 0 : 1.5, ease: 'power1.inOut' });
});
