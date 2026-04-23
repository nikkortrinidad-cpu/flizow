import type { ServiceType, TemplateKey } from '../types/flizow';

/**
 * Template options rendered in every "pick a template" dropdown (Add
 * Service, Edit Service, future Board Settings). The order matches the
 * original mockup's Board Settings picker so an operator who's seen one
 * place isn't hunting when they hit the other.
 *
 * `allowed` gates which types each template can be paired with. Project-
 * specific templates wouldn't make sense on a retainer (a "Brand Refresh
 * retainer" is a contradiction in terms), so they're filtered out when
 * the user has `type: 'retainer'` selected.
 *
 * Kept as a standalone module so both ClientDetailPage (Add Service) and
 * EditServiceModal can share the source of truth without the page-level
 * file exporting constants it otherwise doesn't need to.
 */
export const TEMPLATE_OPTIONS: Array<{
  value: TemplateKey;
  label: string;
  allowed: ServiceType[];
}> = [
  { value: 'demandgen',             label: 'Demand Gen',           allowed: ['retainer', 'project'] },
  { value: 'contentSEO',            label: 'Content + SEO',        allowed: ['retainer', 'project'] },
  { value: 'launch',                label: 'Product Launch',       allowed: ['project'] },
  { value: 'cro',                   label: 'CRO Sprint',           allowed: ['project'] },
  { value: 'paidSocial',            label: 'Paid Social',          allowed: ['retainer', 'project'] },
  { value: 'email',                 label: 'Email Lifecycle',      allowed: ['retainer', 'project'] },
  { value: 'seasonal',              label: 'Seasonal Campaign',    allowed: ['project'] },
  { value: 'localSEO',              label: 'Local SEO',            allowed: ['retainer'] },
  { value: 'paidLead',              label: 'Paid Lead Gen',        allowed: ['retainer', 'project'] },
  { value: 'reputation',            label: 'Reputation',           allowed: ['retainer'] },
  { value: 'social',                label: 'Social Retainer',      allowed: ['retainer'] },
  { value: 'photo',                 label: 'Photo / Video',        allowed: ['retainer', 'project'] },
  { value: 'linkedin',              label: 'LinkedIn Growth',      allowed: ['retainer'] },
  { value: 'website',               label: 'Website Build',        allowed: ['project'] },
  { value: 'web-design-full-stack', label: 'Web Design — Full Stack', allowed: ['project'] },
  { value: 'brand-refresh',         label: 'Brand Refresh',        allowed: ['project'] },
];

/** Default the "next deliverable" date to two weeks out — far enough
 *  that nothing's urgent on day one, close enough that the user will
 *  correct it rather than leave the default in place for a year. */
export function defaultNextDeliverableAt(): string {
  return new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
}
