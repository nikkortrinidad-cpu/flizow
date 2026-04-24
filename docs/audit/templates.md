# Templates — Design Audit

**Surface:** `src/pages/TemplatesPage.tsx` (476 lines) · `src/styles/flizow.css` `.template*` + `.as-*` rules (10302, 12031–12476)
**Run:** 2026-04-24
**Rubric:** 8-step Apple design (belief → 10 HIG → blue tiers → grids → checklist → findings → verify → ship)

---

## 1. Core belief

> The AM came to remind themselves what a service looks like before spinning one up — and to trust that every future service will launch from the same blueprint.

Templates is a **reference page**. It's not where work happens; it's where the AM pattern-matches before work happens. That framing sets a lower bar for interactivity but a higher bar for honesty: every number, every pill, every button has to report accurately, because the AM is using this to decide downstream.

The page's own top comment (lines 10–13) is honest about first-pass scope: "Editing is out of scope for the first pass — the five templates are hard-coded here. Once the admin UI lands, this data moves into the store." Good. The problem is that the UI hasn't caught up with that scope — it renders buttons and sections that imply editability that doesn't exist.

---

## 2. 10 HIG through this page

1. **Clarity beats cleverness.** "Add template" (line 292–295) is a visible solid-styled button with no `onClick`. It's a full Tier-1 CTA that does nothing. "Last edited —" (line 368) is a literal em-dash placeholder — honest-blank, but reads as broken data. The Activity section (lines 454–472) shows a section header and empty-state copy that will never populate because there's no write path.
2. **Interface defers to content.** Left list pane is narrow and quiet; right detail pane holds the payload. Good split.
3. **Direct manipulation.** None — everything is read-only by design. No phase editing, no subtask editing, no brief-field editing. Consistent with the first-pass intent.
4. **Feedback.** Hover on rows, hover on phase toggles, chevron rotates on expand. Ghost affordance: `.template-checklist-item:hover { background: var(--bg-soft); }` (line 12265) — checklist items look tappable but are plain `<div>`s with no onClick. Mouse users will hover, move to click, nothing happens.
5. **Forgiveness.** N/A — nothing to undo.
6. **Consistency.** `.list-pane-search` + `.list-pane-add-btn` are shared with Clients' list pane — good reuse. `.template-row.selected` uses Tier-3 blue tint, matching Clients' row selection.
7. **Hierarchy via typography.** Hero title → section title → meta text — clean 3-level scale. Category chip and "From client" / "From us" pills are consistent shapes.
8. **Motion.** Chevron rotates with transition (line 12211–12212). Accordion uses `display: none` → `display: flex` with **no transition** (line 12214–12221) — abrupt. The chevron slides, the content jumps. Inconsistent.
9. **Accessibility.** `role="list"` + `role="listitem"` on `<a href>` is valid but verbose (SR reads "link, list item" on every row). `aria-expanded` on phase toggle has no `aria-controls` pointing at the subtask panel. `tabIndex={0}` on `<a href>` (line 313) is redundant — anchors are focusable by default. `TemplateIcon` svg (lines 136–183) lacks `aria-hidden` unlike the other icon helpers.
10. **Speed.** Static data, client-side filter, nothing to wait on. Fast.

---

## 3. Blue highlight hierarchy

| Tier | Where it lives | Verdict |
| --- | --- | --- |
| 1 · Solid (CTA) | `.list-pane-add-btn` (Add template) | **Wrong semantic.** The button does nothing — a Tier-1 CTA should only exist for the primary action that actually works. Currently this is a loaded gun with no bullet. |
| 2 · Ring (secondary) | — | Not used. |
| 3 · Tint (active state) | `.template-row.selected` — background tint + left rail | Correct. Matches Clients pattern. |
| 4 · Text-only (inline) | — | Not used. No inline blue links. |

The hero section has no tier assignment — it's pure content, no CTAs. That's appropriate for a reference page.

---

## 4. Grid & layout

- Two-column split: fixed-width list (≈320px) + fluid detail pane via `.templates-split-wrapper` (line 12032).
- Detail pane max-width is unbounded — phase titles and checklist items can stretch across the full pane. No `max-width: 72ch` on body text means long subtask text (e.g., "Cross-browser test" is fine; a hypothetical "Schema markup for FAQ blocks with comprehensive structured-data nesting for Rich Results" would overflow).
- Mobile breakpoint at ≤720px switches the list pane to a top strip (lines 12468–12475). Standard.
- Section spacing: `.template-section { margin-bottom: 36px }` — generous, matches hero-pane scale. Good.

---

## 5. Checklist

| Q | Answer |
| --- | --- |
| 1. Purpose in 5s? | Yes — "Service Templates / Reusable blueprints" header is explicit. |
| 2. Most important thing visually prominent? | Yes — selected template dominates the right pane. |
| 3. Every control one meaning? | **No** — "Add template" button does nothing. |
| 4. Action feedback <100ms? | Yes, except the accordion jumps without transition. |
| 5. Can undo? | N/A — no editing. |
| 6. Consistent patterns? | Yes — list pane matches Clients. |
| 7. Keyboard / screen reader? | Mostly — anchor rows work on Enter (native). Phase toggle has `aria-expanded` but no `aria-controls`. |
| 8. Paints <1.5s? | Yes. |
| 9. Feels like it's working for the user? | Half — the reading experience is clean, the "Add template" and "Activity" stubs undercut the trust. |
| 10. Matches the belief? | Partially — reference reading works; the editorial surface implies an editor that doesn't exist. |

---

## 6. Findings (ranked)

### HIGH (1)

**H1. "Add template" button is a stub that does nothing.**
Line 292–295:

```tsx
<button type="button" className="list-pane-add-btn" aria-label="Add template">
  <PlusIcon />
  <span>Add template</span>
</button>
```

No `onClick`, no form handler, no parent event delegation anywhere in `src/`. The button is styled as a Tier-1 solid CTA (same `list-pane-add-btn` that works on Clients to open the New Client flow), so a first-time user will click it with full confidence and get zero response. Worse than "Saved just now" theatre on Weekly WIP — there the lie is passive text; here the lie is the primary affordance on the left pane.

The `.as-*` CSS block at lines 12291–12429 (≈140 lines) is the matching Add Service modal the button was meant to open — mockup only, never rendered from React. No tsx consumer. Either:
- **Hide the button** until the editor lands (simplest, preserves the first-pass intent stated in the code comment).
- **Disable with a tooltip** ("Editing templates — coming soon") so the affordance is visible but honest.
- **Wire the modal** (biggest lift; moves TEMPLATES into the store, enables CRUD).

Until one of those, every click is a broken promise.

---

### MED (5)

**M1. ≈175 lines of dead CSS across two abandoned feature attempts.**
Verified by grepping every class name in `src/` — zero TSX callers.

| Block | Lines | What it was for |
| --- | --- | --- |
| `.as-modal`, `.as-modal-body`, `.as-picker`, `.as-template-row`, `.as-template-icon/info/name/meta`, `.as-preview`, `.as-preview-title/category/section/section-title/chips/chip/list/list-item`, `.as-preview-group-label`, `.as-form-row`, `.as-form-field` + media query | 12291–12429 (~140) | Add Service modal |
| `.template-activity-item`, `.template-activity-avatar`, `.template-activity-body`, `.template-activity-actor`, `.template-activity-time` | 12435–12466 (~32) | Activity feed rows |

Both sets were built for mockups in `public/projectflow-test.html` and never ported to React. The Activity section in TSX renders only an inline empty state (lines 461–470) — it will never populate because there's no write path for templates to log.

**M2. Hardcoded TEMPLATES data carries a maintenance tax invisible to the UI.**
The full TEMPLATE_DEF array (lines 30–132, ~100 lines of nested object literals) is the only source of truth. The top comment (line 11–12) calls this out as intentional first-pass scope. But the page renders "Add template" and an Activity section, implying editability that doesn't exist. The data-layer and UI-layer are out of sync on what the page *claims* vs what it *does*.

Fix options in order of ambition: (a) hide the stubs until the admin surface lands; (b) add a visible disclaimer ("Templates are read-only until the admin editor launches"); (c) move the data to the store + build the editor.

**M3. Activity section is dead real estate.**
Lines 454–472. Section header ("Activity / Recent changes to this template") + `.template-activity-list` wrapper + empty-state message. Every template shows the same "No activity yet" text. Nothing will populate it because template edits don't flow anywhere. Same "unbuilt feature shown as empty state" pattern that padded Analytics' drill panels and Weekly WIP's live-capture.

Either remove the section until writes exist, or replace it with a one-line disclaimer next to the hero meta: "Version 1 · read-only — editing lands in the admin release."

**M4. "Last edited —" is a sterile placeholder.**
Line 368: `<span className="template-last-edited">Last edited —</span>`. The TEMPLATES data structure has no `lastEdited` field and the em-dash substitutes for missing data. An AM glancing at this reads "broken timestamp" before they read "not yet editable." Remove the span until the data exists.

**M5. `.template-checklist-item:hover` creates a ghost affordance.**
Line 12265: `.template-checklist-item:hover { background: var(--bg-soft); }`. The items are pure `<div>`s (lines 419–423, 429–434) — no `onClick`, no `role`, no keyboard wire. The hover fires on mouse-over and suggests "click to do something," then does nothing. Either make the items interactive (toggle completion? open a tooltip?) or delete the hover rule.

This is a small sibling of Weekly WIP's dead drag-handles — a visual gesture promising an interaction that isn't wired.

---

### LOW (5)

**L1. `data-view="templates"` attribute is a dead hook.**
Line 247: `<div className="view view-templates active" data-view="templates">`. No CSS or JS in `src/` reads `[data-view="templates"]`. Same cross-page leftover as every other page (Board, Ops, Analytics, Weekly WIP, Clients, etc.). Delete in one sweep.

Note: `body[data-active-view="templates"]` IS used — lines 12031, 12468, 12471 — that one is live. The dead one is the page-level `data-view` attribute.

**L2. `tabIndex={0}` on `<a href>` is redundant.**
Line 313: the anchor is already in the tab order because it has `href`. Delete to keep the markup honest about what's doing the work.

**L3. `role="listitem"` on anchor inside `role="list"` is valid but verbose.**
Line 312: the anchor gets both roles. Screen readers announce "link, list item" on every row. Either drop `role="list"`/`role="listitem"` and let the anchor carry its native `link` role, or swap the container to `<ul>` + `<li><a>` and drop the explicit roles. Either simplifies.

**L4. `aria-expanded` on phase toggle has no `aria-controls`.**
Line 384–394. The toggle announces "expanded/collapsed" but not *what* expanded. Add `aria-controls` pointing at an `id` on `.template-phase-subtasks`, or at minimum put the phase name inside the button's accessible name so the announcement reads "Discovery, collapsed, button."

**L5. Phase accordion has no transition.**
CSS at lines 12214 and 12220 toggle `display: none` → `display: flex` — which can't animate. The chevron rotates smoothly (12205–12212) but the content jumps. Either swap to a `max-height` / `opacity` pair for a real accordion animation, or accept the jump and remove the chevron transition for consistency.

---

## 7. V's (3 — good patterns to preserve)

**V1. Per-template phase-open state keyed by id.**
Lines 340–354: `openPhases` is a `Record<string, Set<number>>` keyed by template id. Switching templates doesn't bleed stale open-phase state. The code comment is honest about why this was chosen over `key={template.id}` on the whole detail pane ("cheaper and keyed to the id") — good why-not-what comment. This is the right pattern when child state should survive within a selection but not across selections.

**V2. `useLayoutEffect` pins `body[data-active-view="templates"]`.**
Lines 228–235. Prevents a one-frame flash where the CSS default (`display: none` on `.templates-split-wrapper`) would show before the attribute landed. The comment names ClientsSplit as the established pattern, and the cleanup function guards against clobbering a different view's attribute that set on unmount. Safe and documented.

**V3. Case-insensitive, trimmed search over name AND category.**
Lines 238–244. Minimal, correct, typed. No regex bugs, no fuzzy-match overreach. The fallback to full list when `query` is empty avoids a memo-dependency gotcha. Simple.

---

## 8. Ship plan

Proposed rollout when approved:

1. **H1** — decide: hide the button, disable with tooltip, or wire the modal. If hiding: 2-line delete from TSX. If wiring: multi-hour task that also dissolves M1/M2/M3.
2. **M1** — delete `.as-*` (12291–12429) and `.template-activity-*` (12435–12466) blocks. CSS-only diff. Ship independently.
3. **M3** — delete the Activity section from TSX (lines 454–472). 18-line delete. Pairs naturally with M1.
4. **M4** — delete the "Last edited —" span (line 368). 1-line delete.
5. **M2** — product call: do we ship the admin editor or add a read-only disclaimer?
6. **M5** — decide: wire interaction onto checklist items, or delete the hover rule. 1-line CSS change either way.
7. **L1–L5** — sweep with the next markup/CSS pass.

Lightest page so far — the audit is small because the surface is small, and the core issue is that the surface is *too small* compared to what it visually promises.

---

## Filter question

> **"Does this respect the person using the app?"**

Mostly yes for reading. The hero, phases, checklists, and briefs are clean and honest. But the page carries two visible lies — an "Add template" button that can't add, and an Activity section that will never activate — plus a sterile "Last edited —" that reads as broken data. Respect is 90% there; the last 10% is a one-commit cleanup.
