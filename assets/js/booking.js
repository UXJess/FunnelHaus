(function () {
  var EMBED_SCRIPT = 'https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js';
  var box = document.getElementById('bk-meetings');
  var fallback = document.getElementById('bk-meetings-fallback');
  var panel = document.getElementById('panel-book');
  var mounted = false;

  function meetingsSrc() {
    if (!box) return '';
    var src = (box.getAttribute('data-src') || '').trim();
    if (!src) return '';
    try {
      var u = new URL(src, window.location.href);
      if (u.protocol !== 'https:') return '';
      if (!/(^|\.)hubspot\.com$/i.test(u.hostname)) return '';
      u.searchParams.set('embed', 'true');
      return u.toString();
    } catch (e) {
      return '';
    }
  }

  function showFallback() {
    if (fallback) fallback.hidden = false;
  }

  function mountMeetings() {
    if (mounted || !box) return;
    var src = meetingsSrc();
    if (!src) {
      showFallback();
      return;
    }
    if (fallback) fallback.hidden = true;
    box.setAttribute('data-src', src);
    mounted = true;
    if (!document.getElementById('hs-meetings-embed')) {
      var s = document.createElement('script');
      s.id = 'hs-meetings-embed';
      s.src = EMBED_SCRIPT;
      s.async = true;
      document.body.appendChild(s);
    }
  }

  function maybeMount() {
    if (panel && !panel.classList.contains('is-active')) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(mountMeetings);
    });
  }

  if (box) {
    if (!meetingsSrc()) showFallback();
    maybeMount();
    if (panel && window.MutationObserver) {
      new MutationObserver(maybeMount).observe(panel, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
  }

  document.querySelectorAll('.bk-faq-item button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.bk-faq-item');
      var open = !item.classList.contains('is-open');
      document.querySelectorAll('.bk-faq-item').forEach(function (other) {
        other.classList.remove('is-open');
        other.querySelector('button').setAttribute('aria-expanded', 'false');
        other.querySelector('button span:last-child').textContent = '+';
      });
      if (open) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        btn.querySelector('span:last-child').textContent = '–';
      }
    });
  });
})();
