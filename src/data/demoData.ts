import type {
  FlizowData, Client, Service, Task, Integration, OnboardingItem,
  Contact, QuickLink, Note,
  ColumnId, Priority, IndustryCategory, TemplateKey,
  ServiceType, TaskSeverity, ScheduleMeta,
} from '../types/flizow';
import { CLIENT_SEEDS, type ClientSeed } from './demoClientSeeds';
import { DEMO_AMS, OPS_TEAM } from './demoRosters';
import { ONBOARDING_TEMPLATES, slugifyLabel } from './onboardingTemplates';

/**
 * Port of the mockup's window.FLIZOW_DATA generator
 * (public/flizow-test.html ~25200–25560). Deterministic — same seeds +
 * same `today` produce the same output, so the demo never shifts under
 * the user's feet between page loads.
 *
 * Call generateDemoData() to get a fully populated FlizowData bundle
 * ready to hand to flizowStore.replaceAll().
 */

// ── Deterministic helpers ────────────────────────────────────────────────

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}

// ── Category classification ──────────────────────────────────────────────

/** Regex map from the industry string on a client seed to one of the
 *  ten service-template categories. Order matters — `professional` is
 *  the default fallback. */
const INDUSTRY_CATEGORY: Array<[IndustryCategory, RegExp]> = [
  ['saas',         /Tech|SaaS|Developer/i],
  ['ecommerce',    /E-commerce|Retail · (Fashion|Outdoor|Surf|Water|Handcraft|Floral|jewelry|Fine)/i],
  ['healthcare',   /Healthcare|Biotech|Fitness|Rehab/i],
  ['fnb',          /F&B|Agriculture/i],
  ['education',    /Education|EdTech/i],
  ['professional', /Legal|Finance|FinTech|Professional · Agency|Accounting|Architecture/i],
  ['realestate',   /Real Estate|Hospitality|Travel/i],
  ['services',     /Services · (HVAC|Electrical|Movers|Cybersecurity)/i],
  ['industrial',   /Manufacturing|Aerospace|Automotive|Energy|Logistics/i],
  ['media',        /Media|Gaming|Beauty/i],
];

function categoryFor(industry: string): IndustryCategory {
  for (const [cat, re] of INDUSTRY_CATEGORY) if (re.test(industry)) return cat;
  return 'professional';
}

// ── Service templates + task pools ───────────────────────────────────────

interface ServiceTemplateDef {
  name: string;
  type: ServiceType;
  pool: TemplateKey;
}

const SERVICE_TEMPLATES: Record<IndustryCategory, ServiceTemplateDef[]> = {
  saas: [
    { name: 'Demand Gen Retainer',     type: 'retainer', pool: 'demandgen' },
    { name: 'Content & SEO',           type: 'retainer', pool: 'contentSEO' },
    { name: 'Product Launch',          type: 'project',  pool: 'launch' },
    { name: 'Conversion Optimization', type: 'retainer', pool: 'cro' },
  ],
  ecommerce: [
    { name: 'Paid Social & Shopping', type: 'retainer', pool: 'paidSocial' },
    { name: 'Email Marketing',        type: 'retainer', pool: 'email' },
    { name: 'Seasonal Campaign',      type: 'project',  pool: 'seasonal' },
    { name: 'Site CRO',               type: 'retainer', pool: 'cro' },
  ],
  healthcare: [
    { name: 'Local SEO & Reviews',  type: 'retainer', pool: 'localSEO' },
    { name: 'Patient Acquisition',  type: 'retainer', pool: 'paidLead' },
    { name: 'Content & Compliance', type: 'retainer', pool: 'contentSEO' },
    { name: 'Reputation Rebuild',   type: 'project',  pool: 'reputation' },
  ],
  fnb: [
    { name: 'Social & Influencer',  type: 'retainer', pool: 'social' },
    { name: 'Photography Retainer', type: 'retainer', pool: 'photo' },
    { name: 'Local SEO',            type: 'retainer', pool: 'localSEO' },
    { name: 'Product Launch',       type: 'project',  pool: 'launch' },
  ],
  education: [
    { name: 'Enrollment Funnel',   type: 'retainer', pool: 'paidLead' },
    { name: 'Email Nurture',       type: 'retainer', pool: 'email' },
    { name: 'Content Marketing',   type: 'retainer', pool: 'contentSEO' },
  ],
  professional: [
    { name: 'LinkedIn & PR',    type: 'retainer', pool: 'linkedin' },
    { name: 'Content & SEO',    type: 'retainer', pool: 'contentSEO' },
    { name: 'Website Redesign', type: 'project',  pool: 'website' },
  ],
  realestate: [
    { name: 'Photography & Video', type: 'retainer', pool: 'photo' },
    { name: 'Paid Social',         type: 'retainer', pool: 'paidSocial' },
    { name: 'Email & CRM',         type: 'retainer', pool: 'email' },
  ],
  services: [
    { name: 'Google Ads',          type: 'retainer', pool: 'paidLead' },
    { name: 'Local SEO & Reviews', type: 'retainer', pool: 'localSEO' },
    { name: 'Website Refresh',     type: 'project',  pool: 'website' },
  ],
  industrial: [
    { name: 'PR & Case Studies',   type: 'retainer', pool: 'linkedin' },
    { name: 'Content Marketing',   type: 'retainer', pool: 'contentSEO' },
    { name: 'Trade Show Campaign', type: 'project',  pool: 'seasonal' },
  ],
  media: [
    { name: 'Creator & Influencer', type: 'retainer', pool: 'social' },
    { name: 'Video Production',     type: 'retainer', pool: 'photo' },
    { name: 'Launch Campaign',      type: 'project',  pool: 'launch' },
  ],
};

const TASK_POOLS: Record<TemplateKey, string[]> = {
  demandgen: ['LinkedIn ad creative refresh for pricing audience','Retargeting campaign for demo requests','Webinar landing page A/B test','Q2 account-based campaign kickoff','Email nurture sequence v3','Competitor ad audit','Lead routing QA with sales ops','Q1 campaign performance retro','Attribution model review','Budget reallocation proposal'],
  contentSEO: ['Keyword research for product category pages','Content cluster on migration guides','Technical SEO audit','Blog editorial calendar — Q2','Internal linking cleanup','Pillar page for buyer guide','Featured snippet optimization','Guest post outreach batch','Sitemap regeneration','Schema markup for pricing page'],
  launch: ['Launch plan & timeline','Press release draft','Demo video recording','Product Hunt submission','Launch-day social schedule','Sales enablement deck','Customer reference outreach','Launch email to existing list','Analyst briefing prep','Post-launch retrospective'],
  cro: ['Pricing page hero A/B test','Checkout abandonment funnel fix','Signup form field reduction','Heatmap analysis — homepage','User session replay review','Mobile nav simplification','Trust signal placement test','Free trial onboarding flow','Exit-intent popup v2','Product page FAQ expansion'],
  paidSocial: ['Meta ad creative batch — April','Shopping feed optimization','TikTok Spark Ads test','Pinterest seasonal campaign','Remarketing audience refresh','UGC collection for paid creative','Reel editing for upcoming drop','DPA catalog update','Creative performance report','Budget pacing adjustment'],
  email: ['Monthly newsletter — April','Abandoned cart sequence v2','VIP re-engagement flow','Segmentation cleanup','Template redesign for mobile','Deliverability audit','Black Friday pre-warming','Birthday/anniversary automation','A/B subject line test','Preference center redesign'],
  seasonal: ['Campaign concept & mood board','Landing page build','Influencer outreach list','Asset production schedule','Paid media plan','Launch-week content calendar','PR pitch list','Performance dashboard setup','Budget approval','Post-campaign report'],
  localSEO: ['Google Business Profile updates','Review response automation','Citation cleanup batch','Location page content refresh','Local backlink outreach','NAP consistency audit','Service area page build','Monthly local SEO report','Q&A monitoring setup','Photo upload schedule'],
  paidLead: ['Google Ads search campaign build','Negative keyword list refresh','Landing page variant test','Call tracking setup','Conversion action review','Budget pacing check','Ad copy refresh batch','Bid strategy migration','Performance Max experiment','Monthly paid report'],
  reputation: ['Review audit across platforms','Response templates by scenario','Customer care training session','Negative review mitigation plan','Review request automation','Third-party monitoring setup','Press release — service update','Google Business Profile overhaul'],
  social: ['Content calendar — April','Creator shortlist & outreach','UGC rights collection','Stories series production','Reels editing batch','Community management playbook','Giveaway logistics','Monthly social report','Trend scouting digest','Collab brief for creators'],
  photo: ['Product photography shoot','Lifestyle shoot planning','Post-production batch','Studio booking for next session','Model casting','Asset library reorganization','Color grading standards','Video b-roll capture','Final asset delivery','Archive QA'],
  linkedin: ['Executive thought-leadership posts','PR pitch for industry award','Whitepaper distribution plan','LinkedIn ad creative refresh','Employee advocacy rollout','Media list update','Speaker bureau outreach','Byline article draft','Podcast guest booking','Analyst engagement plan'],
  website: ['Sitemap & wireframe approval','Homepage hero build','Case study template','Navigation redesign','CMS migration plan','Accessibility audit','Performance optimization','Staging QA pass','Analytics event mapping','Launch-day checklist'],
  // Project-specific templates don't use TASK_POOLS — their tasks are
  // hardcoded in the Acme extras below. Empty arrays here so the record
  // type stays exhaustive.
  'web-design-full-stack': [],
  'brand-refresh': [],
};

// ── Schedule seeds ───────────────────────────────────────────────────────

interface ScheduleSeed {
  id: string;
  clientId: string;
  pool: TemplateKey;
  title: string;
  columnId: ColumnId;
  priority: Priority;
  severity?: TaskSeverity;
  /** Days from this week's Monday. 0–4 = Mon–Fri this week; 7–11 next. */
  dayOffset: number;
  tag: ScheduleMeta['tag'];
  meta: string;
  done?: boolean;
}

const SCHEDULE_SEEDS: ScheduleSeed[] = [
  { id: 'seo-audit',            clientId: 'techstart-inc',  pool: 'contentSEO', title: 'TechStart SEO audit final delivery',          columnId: 'review',     priority: 'urgent', severity: 'warning', dayOffset: 0,  tag: 'deadline',  meta: 'Chris Castellano · Running 2 days behind' },
  { id: 'bloom-deck',           clientId: 'bloom-retail',   pool: 'email',      title: 'Bloom Retail reporting deck',                  columnId: 'review',     priority: 'high',   severity: 'warning', dayOffset: 0,  tag: 'deadline',  meta: 'Kate Lawrence · Client meeting at 9am' },
  { id: 'polaris-kickoff',      clientId: 'polaris-aero',   pool: 'contentSEO', title: 'Polaris Aero kickoff meeting',                 columnId: 'done',       priority: 'medium',                      dayOffset: 1,  tag: 'meeting',   meta: '10:00 AM · New client onboarding', done: true },
  { id: 'vertex-scope',         clientId: 'vertex-finance', pool: 'launch',     title: 'Vertex Finance scope change decision',         columnId: 'inprogress', priority: 'urgent', severity: 'warning', dayOffset: 2,  tag: 'deadline',  meta: 'Your sign-off needed by EOD' },
  { id: 'echo-api',             clientId: 'echo-voiceai',   pool: 'demandgen',  title: 'Echo Voice AI API credentials follow-up',      columnId: 'todo',       priority: 'medium',                      dayOffset: 2,  tag: 'deadline',  meta: "Client IT still hasn't responded" },
  { id: 'acme-wireframes',      clientId: 'acme-corp',      pool: 'contentSEO', title: 'Acme wireframes v3 internal review',           columnId: 'inprogress', priority: 'high',                        dayOffset: 2,  tag: 'meeting',   meta: 'Harvey San Juan · Prep before Thu stakeholder call' },
  { id: 'bloom-q2',             clientId: 'bloom-retail',   pool: 'seasonal',   title: 'Bloom Retail Q2 plan — team alignment',        columnId: 'inprogress', priority: 'medium',                      dayOffset: 2,  tag: 'meeting',   meta: '11:00 AM · Kate Lawrence presenting draft' },
  { id: 'summit-calendar',      clientId: 'summit-outdoor', pool: 'paidSocial', title: 'Summit Outdoor content calendar sign-off',     columnId: 'review',     priority: 'medium',                      dayOffset: 2,  tag: 'deadline',  meta: 'May publishing schedule needs approval' },
  { id: 'riverbank-sow',        clientId: 'riverbank-law',  pool: 'linkedin',   title: 'Riverbank Law SOW draft review',               columnId: 'todo',       priority: 'high',                        dayOffset: 2,  tag: 'deadline',  meta: 'New client · Contract terms need your input' },
  { id: 'acme-review',          clientId: 'acme-corp',      pool: 'cro',        title: 'Acme design review — stakeholder walkthrough', columnId: 'inprogress', priority: 'high',                        dayOffset: 3,  tag: 'meeting',   meta: '2:00 PM · Harvey San Juan presenting' },
  { id: 'acme-launch',          clientId: 'acme-corp',      pool: 'cro',        title: 'Acme website launch target',                   columnId: 'inprogress', priority: 'urgent', severity: 'warning', dayOffset: 4,  tag: 'milestone', meta: 'At risk — waiting on client feedback' },
  { id: 'bloom-ads',            clientId: 'bloom-retail',   pool: 'cro',        title: 'Bloom Retail paid ads — performance report',   columnId: 'inprogress', priority: 'medium',                      dayOffset: 4,  tag: 'milestone', meta: 'SEM team · First-week results' },
  { id: 'nw-bloom-retro',       clientId: 'bloom-retail',   pool: 'seasonal',   title: 'Bloom Retail campaign retro',                  columnId: 'todo',       priority: 'medium',                      dayOffset: 7,  tag: 'meeting',   meta: '10:00 AM · Full team debrief' },
  { id: 'nw-polaris-checkin',   clientId: 'polaris-aero',   pool: 'contentSEO', title: 'Polaris Aero 1-week check-in',                 columnId: 'todo',       priority: 'low',                         dayOffset: 8,  tag: 'meeting',   meta: '2:00 PM · Post-kickoff progress review' },
  { id: 'nw-summit-publish',    clientId: 'summit-outdoor', pool: 'paidSocial', title: 'Summit Outdoor May content goes live',         columnId: 'todo',       priority: 'medium',                      dayOffset: 8,  tag: 'milestone', meta: 'First batch of scheduled posts' },
  { id: 'nw-acme-revisions',    clientId: 'acme-corp',      pool: 'contentSEO', title: 'Acme design revisions due',                    columnId: 'todo',       priority: 'high',                        dayOffset: 9,  tag: 'deadline',  meta: 'Harvey San Juan · Based on Thu feedback' },
  { id: 'nw-riverbank-kickoff', clientId: 'riverbank-law',  pool: 'linkedin',   title: 'Riverbank Law project kickoff',                columnId: 'todo',       priority: 'medium',                      dayOffset: 10, tag: 'meeting',   meta: '11:00 AM · New client onboarding' },
  { id: 'nw-vertex-delivery',   clientId: 'vertex-finance', pool: 'launch',     title: 'Vertex Finance mobile module spec delivery',   columnId: 'todo',       priority: 'high',                        dayOffset: 11, tag: 'deadline',  meta: 'End of sprint 1 · Scope approved this week' },
];

const INTEGRATION_POOL = ['Google Analytics','Google Ads','Meta Ads','HubSpot','Salesforce','Klaviyo','Slack','Figma','Notion','Shopify'];

// ── Derived values ───────────────────────────────────────────────────────

/** Skew the kanban column distribution by how far along the service is. */
function distributeColumn(progress: number, i: number, _n: number, seed: number): ColumnId {
  const r = (seed + i * 31) % 100;
  if (progress < 20) return r < 70 ? 'todo' : 'inprogress';
  if (progress < 40) return r < 35 ? 'todo' : (r < 75 ? 'inprogress' : 'review');
  if (progress < 70) return r < 15 ? 'todo' : (r < 55 ? 'inprogress' : (r < 80 ? 'review' : 'done'));
  return r < 10 ? 'inprogress' : (r < 30 ? 'review' : 'done');
}

function progressForStatus(status: ClientSeed['status'], seed: number): number {
  const map: Record<ClientSeed['status'], number> = {
    fire:    30 + (seed % 20),
    risk:    40 + (seed % 20),
    track:   60 + (seed % 30),
    onboard: 5  + (seed % 15),
    paused:  seed % 5,
  };
  return map[status];
}

function mrrForCategory(cat: IndustryCategory, seed: number): number {
  const ranges: Record<IndustryCategory, [number, number]> = {
    saas:         [8000, 18000],
    ecommerce:    [6000, 14000],
    healthcare:   [5000, 12000],
    fnb:          [3000,  8000],
    education:    [4000, 10000],
    professional: [7000, 16000],
    realestate:   [4000, 10000],
    services:     [3000,  7000],
    industrial:   [8000, 20000],
    media:        [5000, 12000],
  };
  const [lo, hi] = ranges[cat];
  return Math.round((lo + (seed % (hi - lo))) / 500) * 500;
}

// ── Date helpers ─────────────────────────────────────────────────────────

function todayAnchor(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function isoFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysFromTodayISO(today: Date, offset: number): string {
  return isoFromDate(new Date(today.getTime() + offset * 86_400_000));
}

// ── Onboarding seeding ───────────────────────────────────────────────────

interface OnboardingOpts {
  /** Client status — drives the default done ratio when `doneLabels` isn't
   *  passed. `'onboard'` → partial (~55% done). Anything else → fully done,
   *  because the setup is long over for a client who's been live for months. */
  status?: ClientSeed['status'];
  /** Explicit "these exact labels are done" override. Used by the Acme
   *  extras so the mockup's 4/7 and 3/6 progress bars reproduce verbatim
   *  no matter what the status-based heuristic would say. */
  doneLabels?: Set<string>;
  /** Stir-value for the `onboard`-status partial distribution. Different
   *  seeds give each service a distinct spread so the UI isn't marking the
   *  same three positions done on every card. */
  seed?: number;
}

/**
 * Expand a template's checklist into concrete OnboardingItem rows.
 *
 * Labels come from ONBOARDING_TEMPLATES keyed by the service's template.
 * Done-state is either drawn from an explicit set (`doneLabels`) or derived
 * from the client's status: `'onboard'` clients land with a partial,
 * deterministic mix so the tab has real work to chip through, and every
 * other status gets "all done" because by the time a client is on-track /
 * at-risk / paused, setup is a closed book.
 */
function buildOnboardingItems(
  serviceId: string,
  templateKey: TemplateKey,
  opts: OnboardingOpts,
): OnboardingItem[] {
  const template = ONBOARDING_TEMPLATES[templateKey];
  if (!template) return [];

  const { status, doneLabels, seed = 0 } = opts;
  const items: OnboardingItem[] = [];
  let idx = 0;

  const push = (group: 'client' | 'us', label: string) => {
    let done: boolean;
    if (doneLabels) {
      done = doneLabels.has(label);
    } else if (status === 'onboard') {
      // ~55% done, deterministically scattered. Keeps the checklist
      // visibly live instead of "all green" or "all empty".
      done = ((seed * 31 + idx * 17) % 100) < 55;
    } else {
      done = true;
    }
    items.push({
      id: `${serviceId}-${slugifyLabel(label)}`,
      serviceId,
      group,
      label,
      done,
    });
    idx++;
  };

  template.client.forEach(label => push('client', label));
  template.us.forEach(label => push('us', label));
  return items;
}

// ── Contact / quick-link seeding ─────────────────────────────────────────

const CONTACT_NAMES = [
  'Sarah Chen',      'Marcus Rivera',   'Priya Patel',     'James Oduya',
  'Elena Moretti',   'Diego Fernandez', 'Amara Okonkwo',   'Lina Tran',
  'Owen Mitchell',   'Hana Watanabe',   'Nikolai Volkov',  'Farida Haddad',
  'Robert Langston', 'Ines Ribeiro',    'Tomas Svensson',  'Layla Martin',
] as const;

const CONTACT_ROLES = [
  'VP Marketing',         'Head of Growth',      'Marketing Director',
  'Chief Marketing Officer', 'Director of Digital', 'Brand Manager',
  'Founder & CEO',        'Head of Demand Gen',  'Product Marketing Lead',
  'Operations Lead',      'Head of Partnerships', 'Chief of Staff',
] as const;

function slugDomain(clientName: string): string {
  return clientName
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24) || 'client';
}

function emailOf(fullName: string, domain: string): string {
  const first = fullName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  return `${first}@${domain}.com`;
}

function buildContacts(clientId: string, clientName: string, seed: number): Contact[] {
  const count = 2 + (seed % 3); // 2–4 contacts
  const domain = slugDomain(clientName);
  const out: Contact[] = [];
  for (let i = 0; i < count; i++) {
    const name = CONTACT_NAMES[(seed + i * 7) % CONTACT_NAMES.length];
    const role = CONTACT_ROLES[(seed + i * 11) % CONTACT_ROLES.length];
    out.push({
      id: `${clientId}-contact-${i}`,
      clientId,
      name,
      role,
      email: emailOf(name, domain),
      // Roughly one in three carries a phone — keeps the list from
      // feeling uniform.
      phone: (seed + i) % 3 === 0
        ? `+1 (415) 555-${String(((seed + i * 41) % 10000)).padStart(4, '0')}`
        : undefined,
      primary: i === 0,
    });
  }
  return out;
}

interface QuickLinkDef {
  label: string;
  urlFor: (domain: string, clientId: string) => string;
  icon: NonNullable<QuickLink['icon']>;
}

const QUICK_LINK_CATALOG: QuickLinkDef[] = [
  { label: 'Website',       urlFor: d => `https://${d}.com`,                icon: 'globe' },
  { label: 'Shared Drive',  urlFor: (_d, cid) => `https://drive.google.com/drive/folders/${cid}`, icon: 'drive' },
  { label: 'Brand Guide',   urlFor: (_d, cid) => `https://docs.google.com/document/d/${cid}-brand`, icon: 'doc' },
  { label: 'Design Files',  urlFor: (_d, cid) => `https://figma.com/files/team/${cid}`, icon: 'figma' },
  { label: 'Asset Library', urlFor: (_d, cid) => `https://drive.google.com/drive/folders/${cid}-assets`, icon: 'folder' },
  { label: 'Status Portal', urlFor: (_d, cid) => `https://flizow.app/c/${cid}`, icon: 'link' },
];

// ── Notes seeding ────────────────────────────────────────────────────────

/** Small stable of note bodies keyed by client status. The Notes tab isn't
 *  the place for filler lorem ipsum — a two-line, plausible agency note
 *  makes the tab feel lived-in from first render. */
const NOTE_BODIES_BY_STATUS: Record<string, string[]> = {
  fire: [
    '<h3>Escalation log</h3><p>Client raised timeline concerns on Tuesday. Owner has the response drafted — awaiting sign-off before send. Keep AM in the loop.</p><ul><li>Call scheduled for Thursday 2pm</li><li>Draft response in Drive</li><li>Track turnaround on open blockers</li></ul>',
    '<h3>Weekly pulse</h3><p>Three blockers hit this sprint. Pattern looks like <strong>approval latency</strong> rather than execution. Flag at next WIP.</p>',
  ],
  risk: [
    '<h3>Retention notes</h3><p>Signals of drift: fewer open tickets, slower email replies. Worth pulling performance numbers before the next check-in.</p><ul><li>Pull last 90 days of engagement</li><li>Draft QBR agenda</li><li>Loop in AM lead</li></ul>',
    '<h3>Follow-up</h3><p>Customer asked about scope expansion but deferred on signing. Revisit in 2 weeks if no movement.</p>',
  ],
  track: [
    '<h3>Ongoing</h3><p>Client is steady. Regular retainer cadence holding up. Document any one-off asks here so they don\'t get lost.</p>',
    '<h3>Opportunities</h3><p>They mentioned a Q3 expansion push. Worth drafting a proposal ahead of the QBR — historically they sign during that window.</p>',
  ],
  onboard: [
    '<h3>Kickoff notes</h3><p>Initial kickoff went well. Team aligned on scope and cadence. Next steps: finalise working agreement, provision tooling, introduce project team.</p><ul><li>Access provisioning — in progress</li><li>Working agreement — draft shared</li><li>Kickoff retro — scheduled</li></ul>',
  ],
  paused: [
    '<h3>Paused</h3><p>Retainer paused mid-quarter. Check in monthly. Door is open when they\'re ready to resume.</p>',
  ],
};

function buildNotes(
  clientId: string,
  clientName: string,
  status: string,
  seed: number,
  todayStr: string,
): Note[] {
  // Keep the seed light — not every client needs multiple notes to look
  // plausible. One per client is enough to show the layout; a couple of
  // the more active statuses get two.
  const pool = NOTE_BODIES_BY_STATUS[status] ?? NOTE_BODIES_BY_STATUS.track;
  const n = Math.min(pool.length, 1 + (seed % 2));
  const out: Note[] = [];
  for (let i = 0; i < n; i++) {
    const daysAgo = 3 + i * 6 + (seed % 10);
    const iso = new Date(
      new Date(todayStr).getTime() - daysAgo * 86_400_000,
    ).toISOString();
    out.push({
      id: `${clientId}-note-${i}`,
      clientId,
      body: pool[i],
      // Pin the most recent note per client so the Notes sidebar always
      // has a top item that's not buried by idle notes.
      pinned: i === 0,
      createdAt: iso,
      updatedAt: iso,
    });
  }
  // Silences the unused-param warning while keeping the signature clean
  // in case we later want to include the client's name in the body.
  void clientName;
  return out;
}

function buildQuickLinks(clientId: string, clientName: string, seed: number): QuickLink[] {
  const count = 3 + (seed % 3); // 3–5 links
  const domain = slugDomain(clientName);
  const out: QuickLink[] = [];
  // Website is always first — it's the one link every client has.
  const picks: QuickLinkDef[] = [QUICK_LINK_CATALOG[0]];
  for (let i = 1; picks.length < count && i < QUICK_LINK_CATALOG.length * 2; i++) {
    const def = QUICK_LINK_CATALOG[(seed + i * 3) % QUICK_LINK_CATALOG.length];
    if (!picks.includes(def)) picks.push(def);
  }
  picks.forEach((def, i) => {
    out.push({
      id: `${clientId}-link-${i}`,
      clientId,
      label: def.label,
      url: def.urlFor(domain, clientId),
      icon: def.icon,
    });
  });
  return out;
}

// ── Main build ───────────────────────────────────────────────────────────

export function generateDemoData(): FlizowData {
  const today = todayAnchor();
  const todayStr = isoFromDate(today);

  const clients: Client[] = [];
  const services: Service[] = [];
  const tasks: Task[] = [];
  const integrations: Integration[] = [];
  const onboardingItems: OnboardingItem[] = [];
  const contacts: Contact[] = [];
  const quickLinks: QuickLink[] = [];
  const notes: Note[] = [];

  const members = [...DEMO_AMS, ...OPS_TEAM];
  const operatorIds = OPS_TEAM.map(m => m.id);

  CLIENT_SEEDS.forEach(seedRow => {
    const seed = hash(seedRow.id);
    const cat = categoryFor(seedRow.industry);
    const amId = seedRow.amInits.toLowerCase();

    // Pick a 3–5 person project team from the ops roster, excluding the AM.
    // Deterministic, rotating start so teams spread across the roster
    // instead of piling on the first few operators.
    const teamSize = 3 + (seed % 3);
    const teamIds: string[] = [];
    for (let ti = 0; ti < teamSize; ti++) {
      const mid = operatorIds[(seed + ti * 5) % operatorIds.length];
      if (mid !== amId && !teamIds.includes(mid)) teamIds.push(mid);
    }

    const client: Client = {
      id: seedRow.id,
      name: seedRow.name,
      initials: seedRow.initials,
      logoClass: seedRow.logoClass,
      status: seedRow.status,
      industry: seedRow.industry,
      industryCategory: cat,
      amId,
      mrr: mrrForCategory(cat, seed),
      renewsAt: daysFromTodayISO(today, 30 + (seed % 240)),
      startedAt: daysFromTodayISO(today, -180 - (seed % 900)),
      serviceIds: [],
      teamIds,
    };

    // Seed 2–4 contacts and 3–5 quick links per client.
    contacts.push(...buildContacts(seedRow.id, seedRow.name, seed));
    quickLinks.push(...buildQuickLinks(seedRow.id, seedRow.name, seed));
    notes.push(...buildNotes(seedRow.id, seedRow.name, seedRow.status, seed, todayStr));

    const catServices = SERVICE_TEMPLATES[cat];
    const nServices = Math.min(2 + (seed % 3), catServices.length);
    const offset = seed % catServices.length;

    for (let si = 0; si < nServices; si++) {
      const tmpl = catServices[(offset + si) % catServices.length];
      const serviceId = `${seedRow.id}-svc-${si}`;
      const progress = progressForStatus(seedRow.status, seed + si * 7);

      const service: Service = {
        id: serviceId,
        clientId: seedRow.id,
        name: tmpl.name,
        type: tmpl.type,
        templateKey: tmpl.pool,
        progress,
        nextDeliverableAt: daysFromTodayISO(today, 3 + ((seed + si) % 25)),
        taskIds: [],
      };

      const pool = TASK_POOLS[tmpl.pool];
      const nTasks = 5 + ((seed + si) % 4);
      for (let ti = 0; ti < nTasks; ti++) {
        const taskId = `${serviceId}-t${ti}`;
        const col = distributeColumn(progress, ti, nTasks, seed + si);

        const task: Task = {
          id: taskId,
          serviceId,
          clientId: seedRow.id,
          title: pool[(seed + si * 11 + ti) % pool.length],
          columnId: col,
          priority: pick(['low','medium','high','urgent'] as Priority[], (seed + ti * 3) % 4),
          assigneeId: amId,
          labels: [],
          dueDate: daysFromTodayISO(today, ((seed + ti * 2) % 30) - 3),
          createdAt: daysFromTodayISO(today, -(((seed + ti * 5) % 60) + 1)),
        };

        // Fire clients get a critical-blocker card; risk clients get a
        // warning-tinted in-progress card. Mirrors the mockup's "why this
        // board is on fire" visual signal.
        if (seedRow.status === 'fire' && si === 0 && ti === 0) {
          task.severity = 'critical';
          task.priority = 'urgent';
          task.columnId = 'blocked';
          task.dueDate = daysFromTodayISO(today, -(((seed) % 9) + 1));
          task.blockerReason = pick(
            ['Waiting on client feedback','Missing creative assets','Legal review pending','Budget approval stalled'],
            seed % 4,
          );
        } else if (seedRow.status === 'risk' && col === 'inprogress' && ti < 2) {
          task.severity = 'warning';
          task.priority = ti === 0 ? 'high' : 'medium';
          task.dueDate = daysFromTodayISO(today, ((seed + si * 7 + ti * 3) % 7) - 2);
        }

        tasks.push(task);
        service.taskIds.push(taskId);
      }

      services.push(service);
      client.serviceIds.push(serviceId);

      // Seed the onboarding checklist for this service. For fully
      // ramped-up clients (track / fire / risk / paused) treat the
      // setup as long complete; only onboard-status clients carry
      // partially-done lists so the tab actually has something to do.
      onboardingItems.push(
        ...buildOnboardingItems(serviceId, tmpl.pool, {
          status: seedRow.status,
          seed: seed + si,
        }),
      );
    }

    // 2–4 integrations per client, mostly connected with the occasional error.
    const nInt = 2 + (seed % 3);
    for (let ii = 0; ii < nInt; ii++) {
      integrations.push({
        clientId: seedRow.id,
        name: INTEGRATION_POOL[(seed + ii * 3) % INTEGRATION_POOL.length],
        status: ((seed + ii) % 11 === 0) ? 'error' : 'connected',
      });
    }

    clients.push(client);
  });

  // ── Schedule seeds become real kanban cards ─────────────────────────

  const scheduleTaskMap: { [id: string]: string } = {};
  const clientById: { [id: string]: Client } = {};
  clients.forEach(c => { clientById[c.id] = c; });

  // Days from this week's Monday — so the schedule always lands in the
  // visible window no matter when the user loads.
  const todayDow = today.getDay(); // 0=Sun, 6=Sat
  const daysToMonday = todayDow === 0 ? -6 : (1 - todayDow);
  const dayFromMonday = (off: number) => daysFromTodayISO(today, daysToMonday + off);

  SCHEDULE_SEEDS.forEach(seedItem => {
    const clientServices = services.filter(s => s.clientId === seedItem.clientId);
    if (!clientServices.length) return;
    const target =
      clientServices.find(s => s.templateKey === seedItem.pool) || clientServices[0];
    const amId = clientById[seedItem.clientId]?.amId ?? null;

    const task: Task = {
      id: seedItem.id,
      serviceId: target.id,
      clientId: seedItem.clientId,
      title: seedItem.title,
      columnId: seedItem.columnId,
      priority: seedItem.priority,
      assigneeId: amId,
      labels: [],
      dueDate: dayFromMonday(seedItem.dayOffset),
      createdAt: daysFromTodayISO(today, -7),
      _schedule: { tag: seedItem.tag, meta: seedItem.meta, done: !!seedItem.done },
    };
    if (seedItem.severity) task.severity = seedItem.severity;
    tasks.push(task);
    target.taskIds.push(seedItem.id);
    scheduleTaskMap[seedItem.id] = target.id;
  });

  // ── Acme extras: two hardcoded projects end-to-end ──────────────────

  const acme = clientById['acme-corp'];
  if (acme) {
    const amId = acme.amId ?? 'nt';

    const mkTask = (
      id: string, serviceId: string, title: string, col: ColumnId,
      priority: Priority, dueOffset: number, createdOffset: number,
    ): Task => ({
      id, serviceId, clientId: 'acme-corp',
      title, columnId: col, priority,
      assigneeId: amId, labels: [],
      dueDate: daysFromTodayISO(today, dueOffset),
      createdAt: daysFromTodayISO(today, createdOffset),
    });

    // Marketing Site v3
    const msId = 'acme-corp-svc-ms3';
    const ms: Service = {
      id: msId, clientId: 'acme-corp',
      name: 'Marketing Site v3', type: 'project',
      templateKey: 'web-design-full-stack',
      progress: 62,
      nextDeliverableAt: daysFromTodayISO(today, 14),
      taskIds: [],
    };
    const msTasks: Task[] = [
      mkTask(`${msId}-t0`, msId, 'Discovery interviews synthesis',       'done',       'medium', -18, -32),
      mkTask(`${msId}-t1`, msId, 'Sitemap & IA approved by stakeholders','done',       'high',   -11, -24),
      mkTask(`${msId}-t2`, msId, 'Low-fidelity wireframes — core flows', 'done',       'high',    -5, -14),
      mkTask(`${msId}-t3`, msId, 'Homepage visual design — round 2',     'review',     'high',     1,  -8),
      mkTask(`${msId}-t4`, msId, 'Component library build (tokens + UI)','inprogress', 'high',     6,  -7),
      mkTask(`${msId}-t5`, msId, 'Analytics + tag verification plan',    'todo',       'medium',  17,  -2),
    ];
    msTasks.forEach(t => { tasks.push(t); ms.taskIds.push(t.id); });
    services.push(ms);
    acme.serviceIds.unshift(msId);

    // Mockup shows Marketing Site v3 at 4 of 7 items complete. Pin
    // exactly which ones are done so the strip matches the reference.
    onboardingItems.push(
      ...buildOnboardingItems(msId, 'web-design-full-stack', {
        doneLabels: new Set([
          'Domain registrar credentials',
          'Hosting or CDN access',
          'Brand kit — logos, fonts, colors',
          'Provision staging environment',
        ]),
      }),
    );

    // Brand Refresh Q2
    const brId = 'acme-corp-svc-brq2';
    const br: Service = {
      id: brId, clientId: 'acme-corp',
      name: 'Brand Refresh Q2', type: 'project',
      templateKey: 'brand-refresh',
      progress: 35,
      nextDeliverableAt: daysFromTodayISO(today, 21),
      taskIds: [],
    };
    const brTasks: Task[] = [
      mkTask(`${brId}-t0`, brId, 'Leadership discovery interviews',        'done',       'high',   -12, -26),
      mkTask(`${brId}-t1`, brId, 'Customer interview insights synthesis',  'done',       'medium',  -6, -18),
      mkTask(`${brId}-t2`, brId, 'Moodboard directions — round 1',         'review',     'high',     2,  -7),
      mkTask(`${brId}-t3`, brId, 'Typography study — headline pairings',   'inprogress', 'medium',   8,  -4),
      mkTask(`${brId}-t4`, brId, 'Logo concepts — three directions',       'todo',       'high',    15,  -1),
      mkTask(`${brId}-t5`, brId, 'Rollout kit — templates scope draft',    'todo',       'low',     26,  -1),
    ];
    brTasks.forEach(t => { tasks.push(t); br.taskIds.push(t.id); });
    services.push(br);
    acme.serviceIds.unshift(brId);

    // Mockup shows Brand Refresh Q2 at 3 of 6 items complete.
    onboardingItems.push(
      ...buildOnboardingItems(brId, 'brand-refresh', {
        doneLabels: new Set([
          'Existing brand history & assets shared',
          'Leadership interviews scheduled',
          'Set up moodboard workspace',
        ]),
      }),
    );
  }

  return {
    clients,
    services,
    tasks,
    members,
    integrations,
    onboardingItems,
    contacts,
    quickLinks,
    notes,
    today: todayStr,
    scheduleTaskMap,
  };
}
