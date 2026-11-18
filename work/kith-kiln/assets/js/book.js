/*
 * Kith & Kiln — booking page.
 * Flow: schedule -> pick a spot in the room -> checkout -> confirmation.
 * Fixed weekly timetable, spots that stay the same on refresh, one summary.
 * Nothing is sent anywhere: this is a concept page.
 */
(function () {
  'use strict';

  /* ── Mobile menu (same behaviour as the home page) ── */
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
    sheet.addEventListener('click', function (e) { if (e.target === sheet) setMenu(false); });
    sheet.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ── Newsletter field (no backend) ── */
  var news = document.getElementById('news-form');
  if (news) {
    news.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('news-email');
      var status = document.getElementById('news-status');
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      status.textContent = ok ? 'Thanks. You are on the list.' : 'Enter a valid email address.';
      if (ok) input.value = '';
    });
  }

  /* ── Data ── */
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var CLASS_MIN = 50, HOUSE_MIN = 90, MASSAGE_MIN = 50, CAPACITY = 12, SHOW_DAYS = 14;
  var PRICES = { first: 25, single: 38, member: 0 };
  var MASSAGE_PRICE = 120;

  var TYPES = {
    Pilates: { room: 'Reformer room', spot: 'reformer', noun: 'Reformer', prefix: 'R', info: 'Reformer Pilates. Slow, loaded, precise. Springs and straps, all levels. Grip socks are at the desk.' },
    Cycle: { room: 'Cycle room', spot: 'bike', noun: 'Bike', prefix: 'B', info: 'Fifty minutes on the bike. Rhythm, climbs, a hard finish. Shoes clip in, or bring trainers.' },
    HIIT: { room: 'The floor', spot: 'station', noun: 'Station', prefix: 'S', info: 'Intervals on the floor. Work, rest, repeat. Sweat first.' },
    Strength: { room: 'The floor', spot: 'station', noun: 'Station', prefix: 'S', info: 'Dumbbells, barbells and a clear plan. Lift heavy, rest properly.' }
  };
  // [hour, minute, type, coach]
  var WEEKDAY = [
    [6, 15, 'Cycle', 'Mara Quinn'], [7, 30, 'Pilates', 'Iris Delaney'], [12, 15, 'HIIT', 'Theo Marsh'],
    [17, 30, 'Strength', 'Jonah Reyes'], [18, 45, 'Pilates', 'Wren Callaghan']
  ];
  var SATURDAY = [[8, 0, 'Cycle', 'Dani Okafor'], [9, 15, 'Pilates', 'Iris Delaney'], [10, 30, 'Strength', 'Jonah Reyes']];
  var SUNDAY = [[9, 0, 'Pilates', 'Wren Callaghan'], [10, 15, 'Cycle', 'Mara Quinn']];
  var COACHES = ['Dani Okafor', 'Iris Delaney', 'Jonah Reyes', 'Mara Quinn', 'Theo Marsh', 'Wren Callaghan'];

  function timetable(date) {
    var d = date.getDay();
    return d === 0 ? SUNDAY : d === 6 ? SATURDAY : WEEKDAY;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDay(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()); }
  function clock(totalMin) {
    var h24 = Math.floor(totalMin / 60) % 24, m = totalMin % 60, h = h24 % 12 === 0 ? 12 : h24 % 12;
    return h + ':' + pad(m) + ' ' + (h24 < 12 ? 'am' : 'pm');
  }
  function longDate(date) { return DAYS_LONG[date.getDay()] + ', ' + MONTHS_LONG[date.getMonth()] + ' ' + date.getDate(); }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function initials(name) { return name.split(' ').map(function (p) { return p.charAt(0); }).join(''); }
  function dollars(n) { return '$' + n; }
  // The same class always shows the same room, so a refresh does not reshuffle it.
  function spotsLeft(key) {
    var r = hash(key) % 100;
    if (r < 12) return 0;
    if (r < 40) return 1 + (r % 3);
    return 4 + (r % (CAPACITY - 3));
  }
  function takenSpots(cls) {
    var order = [];
    for (var i = 1; i <= CAPACITY; i++) order.push(i);
    order.sort(function (a, b) { return hash(cls.id + ':' + a) - hash(cls.id + ':' + b); });
    return order.slice(0, CAPACITY - cls.left);
  }

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  var days = [];
  for (var i = 0; i < SHOW_DAYS; i++) {
    var dd = new Date(today);
    dd.setDate(today.getDate() + i);
    days.push(dd);
  }

  var state = { day: isoDay(days[0]), coach: 'all', type: 'all', cls: null, spot: null, booked: false };
  var catalog = {};
  function $(id) { return document.getElementById(id); }

  /* ── Views and history ── */
  var ORDER = ['schedule', 'spot', 'checkout', 'done'];
  function allowed(view) {
    if (view === 'spot') return !!state.cls;
    if (view === 'checkout') return !!state.cls && !!state.spot;
    if (view === 'done') return state.booked;
    return true;
  }
  function show(view, push, quiet) {
    if (!allowed(view)) view = 'schedule';
    document.querySelectorAll('.bk-view').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== view; });
    $('bk-steps').hidden = view === 'done';
    var cur = ORDER.indexOf(view);
    if (cur < 3) $('bk-steps').style.setProperty('--i', cur);
    document.querySelectorAll('#bk-steps li').forEach(function (li, idx) {
      var b = li.querySelector('button');
      var step = b.getAttribute('data-step');
      if (step === view) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.disabled = idx > cur && !allowed(step);
      b.classList.toggle('is-done', idx < cur);
      li.classList.toggle('is-done', idx < cur);
    });
    if (view === 'spot') renderSpot();
    if (view === 'checkout') renderSummary();
    if (push) history.pushState({ view: view }, '', view === 'schedule' ? location.pathname : '#' + view);
    if (quiet) return;
    window.scrollTo(0, 0);
    var h = document.querySelector('.bk-view:not([hidden]) h1');
    if (h) h.focus({ preventScroll: true });
  }
  window.addEventListener('popstate', function (e) { show((e.state && e.state.view) || 'schedule', false); });
  history.replaceState({ view: 'schedule' }, '', location.pathname);
  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]');
    if (go) show(go.getAttribute('data-go'), true);
    var step = e.target.closest('#bk-steps button');
    if (step && !step.disabled) show(step.getAttribute('data-step'), true);
  });

  /* ── 1 · Schedule ── */
  var daysEl = $('bk-days'), classesEl = $('bk-classes');
  function buildDays() {
    daysEl.innerHTML = '';
    days.forEach(function (date, idx) {
      var id = isoDay(date);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'bk-day';
      b.setAttribute('data-day', id);
      b.setAttribute('aria-pressed', id === state.day ? 'true' : 'false');
      b.setAttribute('aria-label', longDate(date));
      b.innerHTML =
        '<span class="bk-day__mon">' + (idx === 0 ? 'Today' : MONTHS[date.getMonth()] + ' ' + date.getDate()) + '</span>' +
        '<span class="bk-day__dow">' + DAYS[date.getDay()] + '</span>';
      daysEl.appendChild(b);
    });
  }
  function classesFor(date) {
    var now = new Date();
    var isToday = isoDay(date) === isoDay(now);
    var nowMin = now.getHours() * 60 + now.getMinutes();
    return timetable(date).map(function (c, idx) {
      var start = c[0] * 60 + c[1];
      var item = {
        id: isoDay(date) + '-' + idx, date: date, start: start, type: c[2], coach: c[3],
        left: spotsLeft(isoDay(date) + '-' + idx), past: isToday && start <= nowMin + 15
      };
      catalog[item.id] = item;
      return item;
    });
  }
  function renderBoard() {
    var date = days.filter(function (x) { return isoDay(x) === state.day; })[0];
    var isToday = isoDay(date) === isoDay(days[0]);
    $('bk-board-date').textContent = longDate(date) + ', ' + date.getFullYear();
    $('bk-today').hidden = isToday;
    daysEl.querySelectorAll('.bk-day').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-day') === state.day ? 'true' : 'false');
    });
    var all = classesFor(date).filter(function (c) { return !c.past; });
    var list = all.filter(function (c) {
      return (state.type === 'all' || c.type === state.type) && (state.coach === 'all' || c.coach === state.coach);
    });
    $('f-clear').hidden = state.type === 'all' && state.coach === 'all';
    if (!list.length) {
      classesEl.innerHTML = '<p class="bk-empty">' +
        (all.length ? 'Nothing matches those filters on this day.' : 'No more classes today. Try tomorrow.') + '</p>';
      return;
    }
    classesEl.innerHTML = list.map(function (c) {
      var full = c.left === 0;
      var low = !full && c.left <= 3;
      return '<article class="bk-row' + (full ? ' is-full' : '') + '">' +
        '<p class="bk-row__time">' + clock(c.start) + '<small>' + CLASS_MIN + ' min</small></p>' +
        '<p class="bk-row__where">Railtown</p>' +
        '<div class="bk-row__class">' +
          '<span class="bk-row__avatar" aria-hidden="true">' + initials(c.coach) + '</span>' +
          '<div><h4 class="bk-row__name">' + esc(c.type) + ' · ' + CLASS_MIN + ' min</h4>' +
          '<p class="bk-row__meta">' + esc(c.coach) + '</p>' +
          '<p class="bk-row__meta">' + esc(TYPES[c.type].room) + '</p></div>' +
        '</div>' +
        '<div class="bk-row__act">' +
          (full ? '<span class="bk-row__full">Full</span>'
                : '<button type="button" class="hero-c__book" data-reserve="' + c.id + '" aria-label="Reserve ' + esc(c.type) + ' at ' + clock(c.start) + '">Reserve</button>') +
          (low ? '<span class="bk-row__low">' + c.left + ' left</span>' : '') +
        '</div>' +
      '</article>';
    }).join('');
  }
  daysEl.addEventListener('click', function (e) {
    var b = e.target.closest('.bk-day');
    if (!b) return;
    state.day = b.getAttribute('data-day');
    renderBoard();
  });
  function pageDays(dir) { daysEl.scrollBy({ left: dir * daysEl.clientWidth * 0.9, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  $('day-prev').addEventListener('click', function () { pageDays(-1); });
  $('day-next').addEventListener('click', function () { pageDays(1); });
  $('bk-today').addEventListener('click', function () {
    state.day = isoDay(days[0]); renderBoard(); daysEl.scrollTo({ left: 0 });
  });

  var coachSel = $('f-coach');
  COACHES.forEach(function (c) { var o = document.createElement('option'); o.textContent = c; coachSel.appendChild(o); });
  coachSel.addEventListener('change', function () { state.coach = coachSel.value; renderBoard(); });
  $('f-type').addEventListener('change', function (e) { state.type = e.target.value; renderBoard(); });
  $('f-clear').addEventListener('click', function () {
    state.coach = 'all'; state.type = 'all'; coachSel.value = 'all'; $('f-type').value = 'all'; renderBoard();
  });
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-reserve]');
    if (!btn) return;
    var id = btn.getAttribute('data-reserve');
    if (state.cls !== id) state.spot = null;
    state.cls = id;
    show('spot', true);
  });

  /* ── Upcoming strip ── */
  var ICONS = {
    Cycle: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16 10 8h5l3 8M10 8l2 8M9 6h3"/>',
    Pilates: '<rect x="3" y="10" width="18" height="5" rx="2.5"/><path d="M7 15v3M17 15v3M6 10V7h4"/>',
    HIIT: '<path d="M13 3 6 13h5l-1 8 7-10h-5z"/>',
    Strength: '<path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12"/>'
  };
  function icon(paths, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }
  function renderUpcoming() {
    var out = [];
    for (var d = 0; d < days.length && out.length < 8; d++) {
      classesFor(days[d]).forEach(function (c) { if (!c.past && c.left > 0 && out.length < 8) out.push(c); });
    }
    $('up-track').innerHTML = out.map(function (c) {
      var isToday = isoDay(c.date) === isoDay(days[0]);
      var when = isToday ? 'Today' : DAYS[c.date.getDay()] + ', ' + MONTHS[c.date.getMonth()] + ' ' + c.date.getDate();
      var low = c.left <= 3 ? '<span class="bk-card__low">' + c.left + ' left</span>' : '';
      return '<li class="bk-card">' +
        '<img class="bk-card__photo" src="/work/kith-kiln/assets/images/classes/' + c.type.toLowerCase() + '.webp" alt="" width="800" height="' + (c.type === 'Strength' ? 600 : 800) + '" loading="lazy" decoding="async">' +
        '<div class="bk-card__top"><span class="bk-card__icon">' + icon(ICONS[c.type]) + '</span>' +
        '<span class="bk-card__pill">' + when + low + '</span></div>' +
        '<h3 class="bk-card__title">' + esc(c.type) + '</h3>' +
        '<p class="bk-card__coach">With ' + esc(c.coach) + '</p>' +
        '<div class="bk-card__foot">' +
          '<span class="bk-card__fact">' + icon('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>') + clock(c.start) + '</span>' +
          '<span class="bk-card__fact">' + icon('<path d="M5 19V13M10 19V9M15 19V5"/>') + CLASS_MIN + ' min</span>' +
          '<button type="button" class="hero-c__book" data-reserve="' + c.id + '" aria-label="Reserve ' + esc(c.type) + ', ' + esc(when) + ' at ' + clock(c.start) + '">Reserve</button>' +
        '</div></li>';
    }).join('');
    syncUpArrows();
  }
  var upTrack = $('up-track');
  function syncUpArrows() {
    var max = upTrack.scrollWidth - upTrack.clientWidth - 2;
    $('up-prev').disabled = upTrack.scrollLeft <= 2;
    $('up-next').disabled = upTrack.scrollLeft >= max;
  }
  function pageUp(dir) {
    upTrack.scrollBy({ left: dir * (upTrack.clientWidth + parseFloat(getComputedStyle(upTrack).columnGap || 0)), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  $('up-prev').addEventListener('click', function () { pageUp(-1); });
  $('up-next').addEventListener('click', function () { pageUp(1); });
  upTrack.addEventListener('scroll', syncUpArrows, { passive: true });
  window.addEventListener('resize', syncUpArrows);

  /* ── 2 · Spot ── */
  var LAYOUT = [ // grid column for each of the 12 spots: three staggered rows of four
    1, 3, 5, 7,
    2, 4, 6, 8,
    1, 3, 5, 7
  ];
  function renderSpot() {
    var c = catalog[state.cls];
    var t = TYPES[c.type];
    $('sp-name').textContent = c.type + ' · ' + CLASS_MIN + ' min';
    $('sp-when').textContent = longDate(c.date) + ', ' + c.date.getFullYear() + ' at ' + clock(c.start);
    $('sp-where').textContent = 'Railtown · ' + t.room + ' · ' + c.coach;
    $('sp-details').textContent = t.info + ' Then 90 minutes in the bathhouse.';
    $('sp-coach').textContent = c.coach;
    var taken = takenSpots(c);
    var map = $('bk-map');
    map.className = 'bk-map bk-map--' + t.spot;
    map.innerHTML = LAYOUT.map(function (col, idx) {
      var n = idx + 1, name = t.prefix + n, isTaken = taken.indexOf(n) !== -1, picked = state.spot === name;
      return '<button type="button" class="bk-spot" style="grid-column:' + col + ' / span 2;grid-row:' + (Math.floor(idx / 4) + 1) + '"' +
        ' data-spot="' + name + '"' + (isTaken ? ' disabled' : '') + ' aria-pressed="' + (picked ? 'true' : 'false') + '"' +
        ' aria-label="' + t.noun + ' ' + n + ', ' + (isTaken ? 'unavailable' : 'available') + '"><span>' + name + '</span></button>';
    }).join('');
    updatePick();
    $('err-spot').textContent = '';
  }
  function updatePick() {
    var c = catalog[state.cls];
    $('sp-pick').textContent = state.spot ? TYPES[c.type].noun + ' ' + state.spot.slice(1) + ' chosen.' : 'No spot chosen yet.';
  }
  $('bk-map').addEventListener('click', function (e) {
    var b = e.target.closest('.bk-spot');
    if (!b || b.disabled) return;
    state.spot = b.getAttribute('data-spot');
    $('bk-map').querySelectorAll('.bk-spot').forEach(function (x) {
      x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
    });
    $('err-spot').textContent = '';
    updatePick();
  });
  $('sp-next').addEventListener('click', function () {
    if (!state.spot) { $('err-spot').textContent = 'Pick a spot to continue.'; return; }
    show('checkout', true);
  });

  /* ── 3 · Checkout ── */
  var form = $('bk-form');
  function current() {
    var fd = new FormData(form);
    return { plan: fd.get('plan') || 'single', massage: !!fd.get('massage'), cls: state.cls ? catalog[state.cls] : null };
  }
  function renderSummary() {
    var c = current();
    var classCost = PRICES[c.plan];
    var total = classCost + (c.massage ? MASSAGE_PRICE : 0);
    $('sum-class').textContent = dollars(classCost);
    $('sum-massage-row').hidden = !c.massage;
    $('sum-total').textContent = dollars(total);
    if (!c.cls) return;
    var t = TYPES[c.cls.type];
    var classEnd = c.cls.start + CLASS_MIN, houseEnd = classEnd + HOUSE_MIN;
    $('sum-when').innerHTML =
      '<p class="bk-summary__day">' + longDate(c.cls.date) + '</p>' +
      '<p class="bk-summary__class">' + esc(c.cls.type) + ', ' + clock(c.cls.start) + '</p>' +
      '<p class="bk-summary__who">With ' + esc(c.cls.coach) + ' · ' + t.noun + ' ' + esc((state.spot || '').slice(1)) +
      ' · <button type="button" class="bk-inline" data-go="schedule">Change class</button></p>';
    var rows = [
      ['Class', clock(c.cls.start) + ' – ' + clock(classEnd)],
      ['Rooms and tea', clock(classEnd) + ' – ' + clock(houseEnd)]
    ];
    if (c.massage) rows.push(['Massage', clock(houseEnd) + ' – ' + clock(houseEnd + MASSAGE_MIN)]);
    $('sum-timeline').innerHTML = rows.map(function (r) { return '<li><span>' + r[0] + '</span><span>' + r[1] + '</span></li>'; }).join('');
  }
  form.addEventListener('change', function (e) {
    if (e.target.name === 'plan' || e.target.name === 'massage') renderSummary();
  });

  var fields = {
    name: { input: $('bk-name'), err: $('err-name'), msg: 'Enter your name.' },
    email: { input: $('bk-email'), err: $('err-email'), msg: 'Enter a valid email address.' }
  };
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
  function setFieldError(f, bad) {
    f.err.textContent = bad ? f.msg : '';
    if (bad) f.input.setAttribute('aria-invalid', 'true'); else f.input.removeAttribute('aria-invalid');
  }
  fields.name.input.addEventListener('input', function () { if (fields.name.input.value.trim()) setFieldError(fields.name, false); });
  fields.email.input.addEventListener('input', function () { if (validEmail(fields.email.input.value)) setFieldError(fields.email, false); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var c = current();
    var nameBad = !fields.name.input.value.trim();
    var emailBad = !validEmail(fields.email.input.value);
    setFieldError(fields.name, nameBad);
    setFieldError(fields.email, emailBad);
    if (nameBad) { fields.name.input.focus(); return; }
    if (emailBad) { fields.email.input.focus(); return; }

    var t = TYPES[c.cls.type];
    var total = PRICES[c.plan] + (c.massage ? MASSAGE_PRICE : 0);
    var houseEnd = c.cls.start + CLASS_MIN + HOUSE_MIN;
    var ref = 'KK-' + (hash(c.cls.id + state.spot + fields.email.input.value) % 90000 + 10000);
    $('done-lede').textContent = 'A confirmation goes to ' + fields.email.input.value.trim() +
      '. Arrive ten minutes early. Robes, towels and tea are in the house.';
    var planName = { first: 'First class', single: 'Single class', member: 'Member' }[c.plan];
    var rows = [
      ['Class', c.cls.type + ' with ' + c.cls.coach],
      ['When', longDate(c.cls.date) + ', ' + clock(c.cls.start)],
      ['Your spot', t.noun + ' ' + state.spot.slice(1)],
      ['Bathhouse until', clock(houseEnd)]
    ];
    if (c.massage) rows.push(['Massage', clock(houseEnd) + ' – ' + clock(houseEnd + MASSAGE_MIN)]);
    rows.push([planName, dollars(PRICES[c.plan])]);
    if (c.massage) rows.push(['Massage', dollars(MASSAGE_PRICE)]);
    rows.push(['Total', dollars(total)], ['Reference', ref]);
    $('done-receipt').innerHTML = rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
    state.booked = true;
    show('done', true);
  });

  $('bk-again').addEventListener('click', function () {
    form.reset();
    state.cls = null; state.spot = null; state.booked = false;
    state.day = isoDay(days[0]); state.coach = 'all'; state.type = 'all';
    coachSel.value = 'all'; $('f-type').value = 'all';
    renderBoard();
    show('schedule', true);
  });

  buildDays();
  renderBoard();
  renderUpcoming();
  show('schedule', false, true);
})();
