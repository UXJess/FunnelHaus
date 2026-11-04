// End frame 4 parallax. Used by variants/v4.html and the hero (index.html).
// Plays across .endScroll; its data-start / data-end (ScrollTrigger positions) let the full
// sequence start it right as the mountain frame's cloud wipe finishes.
// Every layer rises into its final place as you scroll, the far ones barely and the near ones most.
gsap.registerPlugin(ScrollTrigger);
gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
  const spacer = document.querySelector('.endScroll');
  gsap.timeline({
    defaults: { ease: 'none', duration: 1 },
    scrollTrigger: { trigger: spacer, start: spacer.dataset.start || '0 0', end: spacer.dataset.end || '100% 100%', scrub: 1 }
  })
    .from('.v4 .sky', { y: 80 }, 0)
    .from('.v4 .backdrop', { y: 35 }, 0)        // city and mountain backdrop, far layer
    .from('.v4 .ground', { y: 90 }, 0)
    .from('.v4 .cabin', { y: 80 }, 0)           // rises into place, nearest layer
    // text lines drift up at rising speeds, top line slowest, so they open apart and never overlap
    .from('.v4 .we', { y: 60 }, 0)
    .from('.v4 h1', { y: 100 }, 0)
    .from('.v4 .sub', { y: 150 }, 0)
    // the capabilities rise in one after another from the bottom of the list up, then the button arrives
    .from('.v4 .caps li', { autoAlpha: 0, y: 18, duration: 0.3, stagger: { each: 0.025, from: 'end' } }, 0.35)
    .from('.v4 .see', { autoAlpha: 0, y: 16, duration: 0.15 }, 0.55);
});

// Phones: the "Menu" button opens and closes the nav links
const menu = document.querySelector('.v4 .nav-menu');
const links = document.querySelector('.v4 .nav-links');
menu.addEventListener('click', () => {
  const open = links.classList.toggle('is-open');
  menu.setAttribute('aria-expanded', open);
});
