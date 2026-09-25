/*
 * FunnelHaus consent manager
 * ---------------------------------------------------------------
 * Categories:
 *   necessary  — always on (this cookie, security, basic site function)
 *   analytics  — Google Analytics 4, Hotjar
 *   marketing  — Meta Pixel, HubSpot tracking code
 *
 * Nothing in analytics/marketing loads until the visitor opts in AND the
 * matching ID below is non-empty. See README.md for setup.
 *
 * Public API:
 *   fhConsent.has('analytics' | 'marketing' | 'necessary') -> boolean
 *   fhConsent.get()        -> { analytics, marketing, ts, v } | null
 *   fhConsent.open()       -> open the preferences dialog
 *   fhConsent.onChange(fn) -> fn(state) after every saved choice
 *   document 'fhconsent:change' CustomEvent (detail = state)
 */
(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────
  var GA4_ID = '';             // e.g. 'G-XXXXXXXXXX'
  var META_PIXEL_ID = '';      // e.g. '1234567890123456'
  var HOTJAR_ID = '';          // e.g. '1234567' (Site ID, digits only)
  var HUBSPOT_PORTAL_ID = '343712461';
  var HUBSPOT_SCRIPT_HOST = 'js-na3.hs-scripts.com';

  // Bump when the Privacy Policy or cookie categories change materially.
  // Every visitor with an older version is asked again.
  var POLICY_VERSION = 1;

  var COOKIE_NAME = 'fh_consent';
  var MAX_AGE_DAYS = 365;
  var PRIVACY_URL = '/privacy.html';

  // First-party cookies set by optional tags, removed on withdrawal.
  var CATEGORY_COOKIES = {
    analytics: [/^_ga($|_)/, /^_gid$/, /^_gat/, /^_hj/],
    marketing: [/^_fbp$/, /^_fbc$/, /^__hs/, /^hubspotutk$/, /^messagesUtk$/]
  };
  var CATEGORY_STORAGE = {
    analytics: [/^_hj/, /^hj/],
    marketing: []
  };

  // ── STATE ───────────────────────────────────────────────────
  var state = readCookie();
  var loaded = { analytics: false, marketing: false };
  var listeners = [];
  var bannerEl = null;
  var dialogEl = null;
  var backdropEl = null;
  var lastTrigger = null;

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
  }

  // ── COOKIE ──────────────────────────────────────────────────
  function readCookie() {
    var m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
    if (!m) return null;
    try {
      var data = JSON.parse(decodeURIComponent(m[1]));
      if (!data || data.v !== POLICY_VERSION || typeof data.ts !== 'number') return null;
      if (Date.now() - data.ts > MAX_AGE_DAYS * 864e5) return null;
      return {
        v: data.v,
        ts: data.ts,
        analytics: data.analytics === true,
        marketing: data.marketing === true
      };
    } catch (e) {
      return null;
    }
  }

  function writeCookie(s) {
    var value = encodeURIComponent(JSON.stringify({
      v: s.v, ts: s.ts, necessary: true, analytics: s.analytics, marketing: s.marketing
    }));
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = COOKIE_NAME + '=' + value + '; Path=/; Max-Age=' +
      (MAX_AGE_DAYS * 86400) + '; SameSite=Lax' + secure;
  }

  function deleteCookiesMatching(patterns) {
    if (!patterns.length) return;
    var host = location.hostname;
    var parts = host.split('.');
    var domains = [''];
    for (var i = 0; i < parts.length - 1; i++) {
      var d = parts.slice(i).join('.');
      domains.push('; Domain=' + d, '; Domain=.' + d);
    }
    document.cookie.split('; ').forEach(function (pair) {
      var name = pair.split('=')[0];
      if (!name || !patterns.some(function (re) { return re.test(name); })) return;
      domains.forEach(function (dom) {
        document.cookie = name + '=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT' + dom;
      });
    });
  }

  function clearStorageMatching(patterns) {
    if (!patterns.length) return;
    [window.localStorage, window.sessionStorage].forEach(function (store) {
      try {
        for (var i = store.length - 1; i >= 0; i--) {
          var key = store.key(i);
          if (key && patterns.some(function (re) { return re.test(key); })) store.removeItem(key);
        }
      } catch (e) { /* storage blocked */ }
    });
  }

  // ── GOOGLE CONSENT MODE ─────────────────────────────────────
  function updateConsentMode(s) {
    var a = s.analytics ? 'granted' : 'denied';
    var m = s.marketing ? 'granted' : 'denied';
    window.gtag('consent', 'update', {
      analytics_storage: a,
      ad_storage: m,
      ad_user_data: m,
      ad_personalization: m
    });
  }

  // ── TAG LOADERS ─────────────────────────────────────────────
  function injectScript(src, id) {
    if (id && document.getElementById(id)) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    if (id) s.id = id;
    document.head.appendChild(s);
  }

  function loadGA4() {
    if (!GA4_ID) return false;
    window['ga-disable-' + GA4_ID] = false;
    injectScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID), 'fh-ga4');
    window.gtag('js', new Date());
    window.gtag('config', GA4_ID);
    return true;
  }

  function loadHotjar() {
    if (!HOTJAR_ID) return false;
    window.hj = window.hj || function () { (window.hj.q = window.hj.q || []).push(arguments); };
    window._hjSettings = { hjid: Number(HOTJAR_ID), hjsv: 6 };
    injectScript('https://static.hotjar.com/c/hotjar-' + encodeURIComponent(HOTJAR_ID) + '.js?sv=6', 'fh-hotjar');
    return true;
  }

  function loadMetaPixel() {
    if (!META_PIXEL_ID) return false;
    if (!window.fbq) {
      var n = window.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!window._fbq) window._fbq = n;
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      injectScript('https://connect.facebook.net/en_US/fbevents.js', 'fh-meta-pixel');
    }
    window.fbq('consent', 'grant');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
    return true;
  }

  function loadHubSpot() {
    if (!HUBSPOT_PORTAL_ID) return false;
    injectScript('https://' + HUBSPOT_SCRIPT_HOST + '/' + encodeURIComponent(HUBSPOT_PORTAL_ID) + '.js', 'hs-script-loader');
    return true;
  }

  function applyState(s) {
    updateConsentMode(s);
    if (s.analytics && !loaded.analytics) {
      var a1 = loadGA4();
      var a2 = loadHotjar();
      loaded.analytics = a1 || a2;
    }
    if (s.marketing && !loaded.marketing) {
      var m1 = loadMetaPixel();
      var m2 = loadHubSpot();
      loaded.marketing = m1 || m2;
    }
  }

  // Returns true if a tag that already ran on this page was revoked.
  function revoke(prev, next) {
    var needsReload = false;
    if (prev.analytics && !next.analytics) {
      if (GA4_ID) window['ga-disable-' + GA4_ID] = true;
      deleteCookiesMatching(CATEGORY_COOKIES.analytics);
      clearStorageMatching(CATEGORY_STORAGE.analytics);
      if (loaded.analytics) needsReload = true;
    }
    if (prev.marketing && !next.marketing) {
      if (typeof window.fbq === 'function') window.fbq('consent', 'revoke');
      if (window._hsq) window._hsq.push(['doNotTrack']);
      if (window._hsp) window._hsp.push(['revokeCookieConsent']);
      deleteCookiesMatching(CATEGORY_COOKIES.marketing);
      clearStorageMatching(CATEGORY_STORAGE.marketing);
      if (loaded.marketing) needsReload = true;
    }
    return needsReload;
  }

  function save(choice) {
    var prev = state || { analytics: false, marketing: false };
    var next = {
      v: POLICY_VERSION,
      ts: Date.now(),
      analytics: !!choice.analytics,
      marketing: !!choice.marketing
    };
    state = next;
    writeCookie(next);
    var needsReload = revoke(prev, next);
    applyState(next);
    hideBanner();
    listeners.forEach(function (fn) { try { fn(publicState()); } catch (e) { /* listener error */ } });
    try {
      document.dispatchEvent(new CustomEvent('fhconsent:change', { detail: publicState() }));
    } catch (e) { /* old browser */ }
    // Tags that already executed can't be unloaded; a reload drops them.
    if (needsReload) window.location.reload();
  }

  function publicState() {
    return state ? {
      v: state.v, ts: state.ts, necessary: true,
      analytics: state.analytics, marketing: state.marketing
    } : null;
  }

  // ── UI ──────────────────────────────────────────────────────
  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (html != null) node.innerHTML = html;
    return node;
  }

  function buildBanner() {
    if (bannerEl) return bannerEl;
    bannerEl = el('section', {
      'class': 'fhc-banner',
      'aria-label': 'Cookie consent',
      'aria-describedby': 'fhc-banner-text'
    },
      '<div class="fhc-banner-inner">' +
        '<p class="fhc-banner-text" id="fhc-banner-text">' +
          'We use necessary cookies to run this site. With your OK, we\'d also use analytics ' +
          'and marketing cookies to see how the site is used and measure our ads. ' +
          'They stay off unless you turn them on. ' +
          '<a href="' + PRIVACY_URL + '#cookies">Privacy Policy</a>' +
        '</p>' +
        '<div class="fhc-banner-actions">' +
          '<button type="button" class="fhc-btn fhc-btn-choice" data-fhc-action="reject">Reject all</button>' +
          '<button type="button" class="fhc-btn fhc-btn-choice" data-fhc-action="accept">Accept all</button>' +
          '<button type="button" class="fhc-btn fhc-btn-ghost" data-fhc-action="customize">Customize</button>' +
        '</div>' +
      '</div>'
    );
    bannerEl.hidden = true;
    // First in the DOM so keyboard users reach it before page content.
    document.body.insertBefore(bannerEl, document.body.firstChild);
    return bannerEl;
  }

  // Pages can use --fhc-banner-h to lift fixed CTAs above the open banner.
  var bannerObserver = null;
  function syncBannerHeight() {
    if (!bannerEl || bannerEl.hidden) return;
    document.documentElement.style.setProperty('--fhc-banner-h', bannerEl.offsetHeight + 'px');
  }

  function showBanner() {
    buildBanner().hidden = false;
    document.documentElement.classList.add('fhc-banner-open');
    syncBannerHeight();
    if (window.ResizeObserver && !bannerObserver) {
      bannerObserver = new ResizeObserver(syncBannerHeight);
      bannerObserver.observe(bannerEl);
    }
  }

  function hideBanner() {
    if (bannerEl) bannerEl.hidden = true;
    if (bannerObserver) { bannerObserver.disconnect(); bannerObserver = null; }
    document.documentElement.classList.remove('fhc-banner-open');
    document.documentElement.style.removeProperty('--fhc-banner-h');
  }

  function toggleRow(id, title, desc, opts) {
    var input = opts.locked
      ? '<input type="checkbox" id="' + id + '" role="switch" checked disabled aria-describedby="' + id + '-desc">'
      : '<input type="checkbox" id="' + id + '" role="switch" name="' + opts.name + '" aria-describedby="' + id + '-desc">';
    return '<div class="fhc-row">' +
      '<div class="fhc-row-text">' +
        '<label class="fhc-row-title" for="' + id + '">' + title + '</label>' +
        '<p class="fhc-row-desc" id="' + id + '-desc">' + desc + '</p>' +
      '</div>' +
      '<span class="fhc-switch">' + input + '<span class="fhc-switch-track" aria-hidden="true"></span>' +
        (opts.locked ? '<span class="fhc-switch-note">Always on</span>' : '') +
      '</span>' +
    '</div>';
  }

  function buildDialog() {
    if (dialogEl) return dialogEl;
    backdropEl = el('div', { 'class': 'fhc-backdrop', 'data-fhc-action': 'close' });
    backdropEl.hidden = true;

    dialogEl = el('div', {
      'class': 'fhc-dialog',
      'role': 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'fhc-dialog-title',
      'aria-describedby': 'fhc-dialog-desc',
      'tabindex': '-1',
      'data-lenis-prevent': ''
    },
      '<div class="fhc-dialog-head">' +
        '<h2 class="fhc-dialog-title" id="fhc-dialog-title">Cookie preferences</h2>' +
        '<button type="button" class="fhc-close" data-fhc-action="close" aria-label="Close cookie preferences">' +
          '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>' +
        '</button>' +
      '</div>' +
      '<p class="fhc-dialog-desc" id="fhc-dialog-desc">' +
        'Choose which optional cookies we can use. You can change this anytime from ' +
        '"Cookie Settings" in the footer. <a href="' + PRIVACY_URL + '#cookies">Learn more</a>' +
      '</p>' +
      '<form class="fhc-form" novalidate>' +
        toggleRow('fhc-necessary', 'Necessary', 'Keeps the site working and remembers your cookie choice. Can\'t be turned off.', { locked: true }) +
        toggleRow('fhc-analytics', 'Analytics', 'Google Analytics and Hotjar help us see which pages are useful, anonymously and in aggregate.', { name: 'analytics' }) +
        toggleRow('fhc-marketing', 'Marketing', 'Meta Pixel and HubSpot tracking help us measure ads and follow up on inquiries.', { name: 'marketing' }) +
        '<div class="fhc-dialog-actions">' +
          '<button type="submit" class="fhc-btn fhc-btn-choice">Save preferences</button>' +
        '</div>' +
      '</form>'
    );
    dialogEl.hidden = true;

    dialogEl.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget;
      closeDialog();
      save({ analytics: f.elements.analytics.checked, marketing: f.elements.marketing.checked });
    });
    dialogEl.addEventListener('keydown', onDialogKeydown);

    document.body.appendChild(backdropEl);
    document.body.appendChild(dialogEl);
    return dialogEl;
  }

  function focusables(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      function (n) { return n.offsetParent !== null || n === document.activeElement; }
    );
  }

  function onDialogKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeDialog();
      return;
    }
    if (e.key !== 'Tab') return;
    var items = focusables(dialogEl);
    if (!items.length) { e.preventDefault(); return; }
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogEl)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openDialog(trigger) {
    buildDialog();
    lastTrigger = trigger || document.activeElement;
    var f = dialogEl.querySelector('form');
    f.elements.analytics.checked = !!(state && state.analytics);
    f.elements.marketing.checked = !!(state && state.marketing);
    backdropEl.hidden = false;
    dialogEl.hidden = false;
    document.documentElement.classList.add('fhc-dialog-open');
    if (typeof lenis !== 'undefined' && lenis && lenis.stop) lenis.stop();
    var firstToggle = f.elements.analytics;
    (firstToggle || dialogEl).focus();
  }

  function closeDialog() {
    if (!dialogEl || dialogEl.hidden) return;
    dialogEl.hidden = true;
    backdropEl.hidden = true;
    document.documentElement.classList.remove('fhc-dialog-open');
    if (typeof lenis !== 'undefined' && lenis && lenis.start) lenis.start();
    var target = lastTrigger;
    // The banner's Customize button is gone if a choice was just saved.
    if (!target || !document.body.contains(target) || target.offsetParent === null) {
      target = document.querySelector('[data-fhc-open]') || document.body;
    }
    if (target && target.focus) target.focus();
    lastTrigger = null;
  }

  function onClick(e) {
    var t = e.target.closest ? e.target.closest('[data-fhc-action], [data-fhc-open]') : null;
    if (!t) return;
    if (t.hasAttribute('data-fhc-open')) {
      e.preventDefault();
      openDialog(t);
      return;
    }
    switch (t.getAttribute('data-fhc-action')) {
      case 'accept': save({ analytics: true, marketing: true }); break;
      case 'reject': save({ analytics: false, marketing: false }); break;
      case 'customize': openDialog(t); break;
      case 'close': closeDialog(); break;
    }
  }

  // ── INIT ────────────────────────────────────────────────────
  function init() {
    document.addEventListener('click', onClick);
    if (state) {
      applyState(state);
    } else {
      // No valid choice: make sure nothing optional lingers from an old one.
      deleteCookiesMatching(CATEGORY_COOKIES.analytics.concat(CATEGORY_COOKIES.marketing));
      showBanner();
    }
  }

  window.fhConsent = {
    version: POLICY_VERSION,
    has: function (category) {
      if (category === 'necessary') return true;
      return !!(state && state[category] === true);
    },
    get: publicState,
    open: function () { openDialog(document.activeElement); },
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
