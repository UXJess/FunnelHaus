(function () {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function hostFrom(src) {
    try {
      return new URL(src).hostname.replace(/^www\./, '');
    } catch (err) {
      return src;
    }
  }

  class FhSitePreview extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready === '1') return;

      var src = this.getAttribute('src') || 'https://rockymountainsolutions.ca';
      var label = this.getAttribute('label') || 'Rocky Mountain Solutions homepage';
      var host = this.getAttribute('host') || hostFrom(src);
      var safeSrc = escapeHtml(src);
      var safeLabel = escapeHtml(label);
      var safeHost = escapeHtml(host);

      this.classList.add('fh-proof-shot');
      this.innerHTML =
        '<span class="fh-proof-browser" aria-hidden="true">' +
          '<span class="fh-proof-browser-dots"><span></span><span></span><span></span></span>' +
          '<span class="fh-proof-browser-url">' + safeHost + '</span>' +
        '</span>' +
        '<span class="fh-proof-viewport">' +
          '<iframe src="' + safeSrc + '" title="' + safeLabel + '" loading="lazy" tabindex="-1"></iframe>' +
        '</span>' +
        '<a class="fh-proof-shot-link" href="' + safeSrc + '" target="_blank" rel="noopener" aria-label="' + safeLabel + ' (opens in a new tab)"></a>';

      this.dataset.ready = '1';
    }
  }

  customElements.define('fh-site-preview', FhSitePreview);
})();
