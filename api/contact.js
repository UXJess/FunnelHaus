/**
 * POST /api/contact
 * Vercel Node function. Proxies the contact form to HubSpot Forms API v3.
 * Accepts HUBSPOT_PORTAL_ID / HUBSPOT_FORM_GUID (or HS_* aliases).
 */
const PORTAL_ID =
  process.env.HUBSPOT_PORTAL_ID ||
  process.env.HS_PORTAL_ID ||
  '343712461';
const FORM_GUID =
  process.env.HUBSPOT_FORM_GUID ||
  process.env.HS_FORM_ID ||
  'f3724542-495e-4980-8572-ff34842e27e2';
const HS_MARKETING_SUBSCRIPTION_ID = Number(
  process.env.HS_MARKETING_SUBSCRIPTION_ID || 3707224695
);
const HS_ENDPOINT =
  `https://api.hsforms.com/submissions/v3/integration/submit/${PORTAL_ID}/${FORM_GUID}`;

const GENERIC_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'protonmail.com'
];

const SERVICE_LABELS = {
  'design-build': 'Design & Build',
  'creative-content': 'Creative & Content',
  'growth-performance': 'Growth & Performance'
};

const BUDGET_VALUES = new Set(['<5k', '5-7k', '7-10k', '10-15k', '15-20k', '20k+']);

function str(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function emailDomain(email) {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).toLowerCase();
}

function splitName(fullName) {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: '', lastname: '' };
  if (parts.length === 1) return { firstname: parts[0], lastname: parts[0] };
  return { firstname: parts[0], lastname: parts.slice(1).join(' ') };
}

function companyFromWebsite(website, fullName) {
  const raw = str(website, 500);
  if (raw) {
    try {
      const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/\//, '')}`;
      const host = new URL(withProto).hostname.replace(/^www\./, '');
      if (host) return host.slice(0, 255);
    } catch {
      /* keep fallback */
    }
  }
  return fullName.slice(0, 255);
}

function normalizeServices(input) {
  const byLabel = {};
  for (const [slug, label] of Object.entries(SERVICE_LABELS)) {
    byLabel[label.toLowerCase()] = slug;
  }
  const list = Array.isArray(input) ? input : typeof input === 'string' ? [input] : [];
  const unique = [];
  for (const item of list) {
    const raw = str(item, 64);
    const key = SERVICE_LABELS[raw] ? raw : byLabel[raw.toLowerCase()];
    if (key && !unique.includes(key)) unique.push(key);
  }
  return unique;
}

function field(name, value) {
  return { objectTypeId: '0-1', name, value };
}

function buildFields({ fullName, email, website, services, budget, utm_source, utm_medium, utm_campaign, gclid }, extras) {
  const { firstname, lastname } = splitName(fullName);
  const servicesNeeded = services.map((key) => SERVICE_LABELS[key]).join('; ');
  const rows = [
    field('company', companyFromWebsite(website, fullName)),
    field('email', email),
    field('service_type', servicesNeeded || 'Not specified'),
    field('budget_range', budget || 'Not specified')
  ];
  if (!extras) return rows.filter((f) => f.value !== '');

  rows.push(field('firstname', firstname), field('lastname', lastname));
  if (servicesNeeded) rows.push(field('services_needed', servicesNeeded));
  if (website) rows.push(field('website', website));
  if (utm_source) rows.push(field('utm_source', utm_source));
  if (utm_medium) rows.push(field('utm_medium', utm_medium));
  if (utm_campaign) rows.push(field('utm_campaign', utm_campaign));
  if (gclid) rows.push(field('gclid', gclid));
  return rows.filter((f) => f.value !== '');
}

function isUnknownPropertyError(body) {
  const blob = JSON.stringify(body || {});
  return /INVALID_FIELD|unknown field|not a valid field|FIELDS_NOT_IN_FORM/i.test(blob);
}

async function submitHubSpot(payload) {
  const res = await fetch(HS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!PORTAL_ID || !FORM_GUID) {
    console.error('Missing HubSpot environment variables in Vercel dashboard');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};

  // Honeypot — pretend success so bots don't retry.
  if (str(body.hp_website, 200) || str(body.fax, 200)) {
    return res.status(200).json({ success: true, ok: true });
  }

  const fullName = str(body.fullName, 120);
  const email = str(body.email, 254).toLowerCase();
  const website = str(body.website, 500);
  const services = normalizeServices(body.services);
  const budget = BUDGET_VALUES.has(str(body.budget, 40)) ? str(body.budget, 40) : '';
  const utm_source = str(body.utm_source, 120);
  const utm_medium = str(body.utm_medium, 120);
  const utm_campaign = str(body.utm_campaign, 120);
  const gclid = str(body.gclid, 200);

  if (!fullName || !email) {
    return res.status(400).json({ error: 'Full Name and Email are required.' });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const context = {
    pageUri: str(body.pageUri, 1000) || req.headers.referer || 'https://funnelhaus.ca/contact.html',
    pageName: str(body.pageName, 200) || 'Contact Page - FunnelHaus'
  };
  const hutk = str(body.hutk, 64);
  if (hutk) context.hutk = hutk;

  const payload = {
    fields: buildFields(
      { fullName, email, website, services, budget, utm_source, utm_medium, utm_campaign, gclid },
      true
    ),
    context
  };

  const processingText = str(body.processingText, 500) ||
    'By submitting this form, you agree to our Privacy Policy.';
  const optInText = str(body.optInText, 400) ||
    'Send me occasional updates and insights from FunnelHaus. You can unsubscribe anytime.';

  payload.legalConsentOptions = {
    consent: {
      consentToProcess: true,
      text: processingText,
      communications: body.marketingOptIn === true
        ? [{ value: true, subscriptionTypeId: HS_MARKETING_SUBSCRIPTION_ID, text: optInText }]
        : []
    }
  };

  try {
    let result = await submitHubSpot(payload);
    if (!result.ok && isUnknownPropertyError(result.body)) {
      payload.fields = buildFields(
        { fullName, email, website, services, budget, utm_source, utm_medium, utm_campaign, gclid },
        false
      );
      result = await submitHubSpot(payload);
    }
    if (!result.ok) {
      console.error('HubSpot Submission Error:', result.body);
      return res.status(result.status >= 400 ? result.status : 502).json({
        error: 'HubSpot API rejected submission.'
      });
    }
    return res.status(200).json({
      success: true,
      ok: true,
      genericEmail: GENERIC_DOMAINS.includes(emailDomain(email))
    });
  } catch (err) {
    console.error('Serverless Function Error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
