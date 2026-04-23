import type { TemplateKey } from '../types/flizow';

/**
 * Per-template starter-task pools. Used in two places:
 *
 *   1. Demo data (`demoData.ts`) draws 5–9 tasks per service, deterministically
 *      picked so the same demo doesn't shuffle on reload.
 *   2. Real `addService` call (`flizowStore.ts`) seeds the first 3 entries as
 *      "To Do" cards so a brand-new board isn't an empty screen — the Add
 *      Service modal promises "Seeds the board with starter columns and a
 *      few example cards", and this is the delivery side of that promise.
 *
 * Two project-specific templates (`web-design-full-stack`, `brand-refresh`)
 * have bespoke task lists in demoData and don't pull from here — their
 * entries are empty arrays so the record stays exhaustive over TemplateKey.
 */
export const TASK_POOLS: Record<TemplateKey, string[]> = {
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

  // Project-specific templates with bespoke task lists in demoData — empty
  // here so the record type stays exhaustive.
  'web-design-full-stack': [
    'Sitemap & wireframe approval',
    'Homepage hero build',
    'CMS migration plan',
    'Accessibility audit',
    'Launch-day checklist',
  ],
  'brand-refresh': [
    'Leadership interview round 1',
    'Moodboard presentation',
    'Logo concept sketches',
    'Typography pairing options',
    'Brand guideline draft',
  ],
};
