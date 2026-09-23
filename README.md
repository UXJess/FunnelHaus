# FunnelHaus website

Static HTML site hosted on Vercel. Each page carries its own inline CSS/JS; shared
code lives in `assets/`.

## Consent and tracking

Cookie consent is handled by `assets/js/consent.js` + `assets/css/consent.css`,
loaded in the `<head>` of every page right after the Google Consent Mode v2
defaults. Analytics and marketing tags load **only** after the visitor opts in
to that category **and** the tag's ID is set.

| Category  | Tools                          |
|-----------|--------------------------------|
| Necessary | `fh_consent` cookie (always on) |
| Analytics | Google Analytics 4, Hotjar     |
| Marketing | Meta Pixel, HubSpot tracking code |

Do not paste GA4, Hotjar, Meta Pixel or HubSpot snippets into the HTML pages —
they would run before consent. Set the IDs in `consent.js` instead.

### Adding GA4, Meta Pixel or Hotjar

Edit the config block at the top of `assets/js/consent.js`:

```js
var GA4_ID = 'G-XXXXXXXXXX';        // GA4 Measurement ID
var META_PIXEL_ID = '123456789012345';
var HOTJAR_ID = '1234567';           // Hotjar Site ID (digits only)
```

Leave a value as `''` to keep that tool off. In GA4, set data retention to
14 months (Admin → Data collection → Data retention) to match the Privacy Policy.

HubSpot tracking is already configured (`HUBSPOT_PORTAL_ID`) and is gated behind
Marketing consent. Turn off HubSpot's own cookie banner in HubSpot settings so
visitors don't see two banners.

### Bumping the consent policy version

Change `POLICY_VERSION` in `assets/js/consent.js` (e.g. `1` → `2`) whenever the
Privacy Policy or cookie categories change materially — for example, adding a new
tool or category. Every visitor with an older version sees the banner again.
Choices also expire after 12 months. Update the "Last updated" date in
`privacy.html` at the same time.

Other scripts can check consent with `window.fhConsent.has('analytics')` or
`window.fhConsent.has('marketing')`, or listen for the `fhconsent:change` event.

## Contact form marketing opt-in

`contact.html` sends the form to the HubSpot Forms API. The optional "Send me
occasional updates" checkbox lives in a `<template>` and is only rendered (and
sent) when `HS_SEND_MARKETING_OPT_IN` is `true` in the form script.

How the opt-in reaches HubSpot is isolated in `applyMarketingOptIn()`. It
currently sends a `marketing_opt_in` contact property, which must exist on the
HubSpot "Work with us" form first — HubSpot rejects the whole submission if it
doesn't. To switch to `legalConsentOptions`, replace that function's body; it
already receives the checkbox state, the checkbox label text and the privacy
notice text that HubSpot's consent object needs.
