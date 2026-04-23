import type { TemplateKey } from '../types/flizow';

/**
 * Per-template onboarding checklists. When a service spins up we seed one
 * OnboardingItem per entry below, grouped by who owes what.
 *
 *   client — things the client has to hand over before we can start
 *            (assets, credentials, sign-offs).
 *   us     — things we take care of internally (provision envs, draft
 *            briefs, schedule kickoffs).
 *
 * Labels match the mockup's Acme onboarding strip verbatim for the four
 * Acme templates; other templates get generic-but-plausible checklists
 * so every service has something meaningful to show on day one.
 *
 * To add a new template: add it to TemplateKey in types/flizow.ts, then
 * drop a new entry here. Everything else (demo seeding, UI, toggling)
 * picks it up automatically.
 */
export interface OnboardingChecklistDef {
  client: string[];
  us: string[];
}

export const ONBOARDING_TEMPLATES: Record<TemplateKey, OnboardingChecklistDef> = {
  // ── Project templates (from the Acme mockup) ────────────────────────
  'brand-refresh': {
    client: [
      'Existing brand history & assets shared',
      'Leadership interviews scheduled',
      'Reference brands & inspirations',
    ],
    us: [
      'Set up moodboard workspace',
      'Prepare interview script',
      'Create style-tile template',
    ],
  },
  'web-design-full-stack': {
    client: [
      'Domain registrar credentials',
      'Hosting or CDN access',
      'Brand kit — logos, fonts, colors',
      'Content inventory spreadsheet',
    ],
    us: [
      'Provision staging environment',
      'Create GitHub repository',
      'Install Analytics & Tag Manager',
    ],
  },

  // ── Retainer / pool-label templates ─────────────────────────────────
  contentSEO: {
    client: [
      'Google Analytics access granted',
      'Search Console verified',
      'Voice & tone doc approved',
    ],
    us: [
      'Baseline keyword audit',
      'Competitor benchmark drafted',
      'Monthly reporting cadence set',
    ],
  },
  localSEO: {
    client: [
      'Google Business Profile access',
      'NAP (name-address-phone) sources list',
    ],
    us: [
      'Citation audit',
      'Review-response SOP doc',
      'Local keyword shortlist',
    ],
  },
  paidSocial: {
    client: [
      'Ad accounts access (Meta / TikTok)',
      'Past campaign performance export',
    ],
    us: [
      'UTM naming convention doc',
      'Pixel / conversion API check',
      'First 30-day test plan',
    ],
  },
  paidLead: {
    client: [
      'Google Ads access',
      'CRM connection (HubSpot / Salesforce)',
    ],
    us: [
      'Landing page conversion audit',
      'Negative keyword seed list',
      'Weekly reporting cadence',
    ],
  },
  email: {
    client: [
      'ESP access (Klaviyo / Mailchimp)',
      'List hygiene export',
    ],
    us: [
      'Segmentation plan doc',
      'Template system review',
      'Deliverability check',
    ],
  },
  social: {
    client: [
      'Brand voice doc',
      'Past content library access',
    ],
    us: [
      'Content pillars doc',
      'Monthly planning cadence',
      'Approval workflow setup',
    ],
  },
  linkedin: {
    client: [
      'Executive voice interviews scheduled',
      'Sales Navigator seats confirmed',
    ],
    us: [
      'Ghost-writing voice doc',
      'Posting cadence plan',
      'Connection outreach SOP',
    ],
  },
  cro: {
    client: [
      'Analytics & heatmap tool access',
      'Past AB test results export',
    ],
    us: [
      'Experiment hypothesis backlog',
      'Ship cadence doc',
      'QA process agreed',
    ],
  },
  launch: {
    client: [
      'Launch date locked',
      'Press / PR contact list',
      'Social creative assets',
    ],
    us: [
      'Launch day runbook',
      'Cross-channel post calendar',
      'Post-launch retro scheduled',
    ],
  },
  demandgen: {
    client: [
      'Buyer personas doc',
      'CRM + MAP access',
    ],
    us: [
      'Funnel audit',
      'Lead scoring model draft',
      'Attribution tracking plan',
    ],
  },
  seasonal: {
    client: [
      'Seasonal calendar milestones',
      'Inventory / promo plan',
    ],
    us: [
      'Campaign runbook',
      'Creative brief first draft',
    ],
  },
  reputation: {
    client: [
      'Review platform admin access',
      'Escalation contact list',
    ],
    us: [
      'Response tone doc',
      'Alert routing setup',
      'Weekly digest cadence',
    ],
  },
  photo: {
    client: [
      'Shot list approved',
      'Location & talent confirmed',
    ],
    us: [
      'Mood reference deck',
      'Post-production workflow doc',
    ],
  },
  website: {
    client: [
      'Hosting & domain access',
      'Brand kit + copy',
    ],
    us: [
      'Staging env live',
      'Tracking install plan',
      'QA checklist drafted',
    ],
  },
};

/** Slugify a label into an id fragment. Kept tiny — we only need the
 *  ids to be stable across re-seeding, not human-readable. */
export function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}
