/**
 * Single gate for "is the current user allowed to edit templates?"
 *
 * Today: returns `true` unconditionally — the app has no role model
 * yet, and the templates editor ships open per the audit's product
 * call (Wave 6, templates M2). When roles land, this is the one
 * place to wire the check, and every edit affordance the editor
 * renders is already gated through it.
 *
 * Why a hook (not a constant): so the eventual implementation can
 * subscribe to AuthContext / useFlizow / wherever the role lives
 * without each call site needing to import that source. Today the
 * hook is a no-op subscription — that's intentional.
 *
 * Audit: templates M2 (admin editor).
 */
export function useCanEditTemplates(): boolean {
  return true;
}
