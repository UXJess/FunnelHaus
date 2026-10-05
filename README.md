# FunnelHaus website

Static HTML site hosted on Vercel. Each page carries its own inline CSS/JS; shared
code lives in `assets/`.

## Consent and tracking

Cookie consent is handled by `assets/js/consent.js` + `assets/css/consent.css`,
loaded in the `<head>` of every page right after the Google Consent Mode v2
defaults. Analytics and marketing tags load **only** after the visitor opts in
to that category **and** the tag is enabled (`VERCEL_ANALYTICS`) or its ID is set.

| Category  | Tools                          |
|-----------|--------------------------------|
| Necessary | `fh_consent` cookie (always on) |
| Analytics | Vercel Web Analytics, Google Analytics 4, Hotjar |
| Marketing | Meta Pixel, HubSpot tracking code |

Do not paste Vercel Analytics, GA4, Hotjar, Meta Pixel or HubSpot snippets into the HTML pages —
they would run before consent. Vercel Analytics is toggled in `consent.js`; set the other IDs there too.

### Adding Vercel Web Analytics, GA4, Meta Pixel or Hotjar

This is a static HTML site, so Vercel Web Analytics is the official HTML script
(`/_vercel/insights/script.js`) injected from `consent.js` after analytics opt-in —
not the `@vercel/analytics` npm package, which needs a framework/bundler.

Enable Web Analytics on the Vercel project, then keep `VERCEL_ANALYTICS = true`
in `consent.js`. Set `false` to stop loading it. After the next production deploy,
page views from visitors who opted in appear at the project's Analytics tab.

Edit the other IDs in the config block at the top of `assets/js/consent.js`:

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

## Contact form

`contact.html` posts to `/api/contact`, a Vercel function that proxies to the
HubSpot Forms API (portal `343712461`, form `f3724542-…`). Override the IDs with
`HUBSPOT_PORTAL_ID` / `HUBSPOT_FORM_GUID`, or the `HS_PORTAL_ID` / `HS_FORM_ID`
aliases, plus `HS_MARKETING_SUBSCRIPTION_ID` if needed.

The optional "Send me occasional updates" checkbox lives in a `<template>` and
is only rendered (and sent) when `HS_SEND_MARKETING_OPT_IN` is `true` in the
form script. A ticked box subscribes the contact to "Marketing Information"
(`3707224695`). An unticked box sends no subscription, so it never unsubscribes
an existing contact. The box is never pre-ticked.
