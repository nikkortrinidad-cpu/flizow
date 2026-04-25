import type { TemplateRecord } from '../types/flizow';
import { BUILT_IN_TEMPLATES, BUILT_IN_TEMPLATE_IDS } from './builtInTemplates';

/**
 * Live template list = BUILT_IN_TEMPLATES with any per-id overrides
 * from `data.templateOverrides` swapped in, plus user-created records
 * appended. Archived records are filtered out by default — pass
 * `{ includeArchived: true }` for an admin "Archive" surface that
 * needs to see them.
 *
 * Ordering: built-ins first (in their declaration order), user-created
 * after (in their order in templateOverrides — which is insertion
 * order, so newest user-created lands at the end of the picker).
 */
export function resolveTemplates(
  overrides: TemplateRecord[],
  opts: { includeArchived?: boolean } = {},
): TemplateRecord[] {
  const overrideById = new Map(overrides.map((t) => [t.id, t]));
  const out: TemplateRecord[] = [];
  for (const builtin of BUILT_IN_TEMPLATES) {
    out.push(overrideById.get(builtin.id) ?? builtin);
  }
  for (const t of overrides) {
    if (!BUILT_IN_TEMPLATE_IDS.has(t.id)) out.push(t);
  }
  return opts.includeArchived ? out : out.filter((t) => !t.archived);
}

/** True when the id refers to a built-in template (one of the five
 *  shipped in BUILT_IN_TEMPLATES). Drives whether the editor offers
 *  "Reset to default" (built-in only) or "Delete permanently"
 *  (user-created only). */
export function isBuiltInTemplate(id: string): boolean {
  return BUILT_IN_TEMPLATE_IDS.has(id);
}

/** Look up a single template by id, applying override-overlay logic.
 *  Returns null when the id matches neither a built-in nor an override
 *  — e.g., a service pointing at a deleted user-created template. */
export function findTemplate(
  overrides: TemplateRecord[],
  id: string,
): TemplateRecord | null {
  const override = overrides.find((t) => t.id === id);
  if (override) return override;
  const builtin = BUILT_IN_TEMPLATES.find((t) => t.id === id);
  return builtin ?? null;
}

/** Default record for a brand-new user-created template. Used by the
 *  "+ New template" flow so the user starts on a sensible blank
 *  canvas instead of an empty form. The id is filled in by the
 *  caller with crypto.randomUUID(). */
export function blankTemplate(id: string): TemplateRecord {
  return {
    id,
    name: 'New template',
    category: 'Custom',
    icon: 'web',
    phasesSub: '',
    phases: [],
    onboarding: { client: [], us: [] },
    brief: [],
    userCreated: true,
    archived: false,
    editedAt: new Date().toISOString(),
  };
}
