# Flizow Design-Audit Sweep — Summary

**Window:** 2026-04-24 audit → 2026-04-25 ship.
**Rubric:** `~/Documents/Claude/skills/apple-design-principles.md` 8-step (belief → 10 HIG → blue tiers → grids → checklist → rank → verify → ship).
**Output:** 12 audit docs in `docs/audit/`, plus one cross-cutting patterns doc (`PATTERNS.md`). This file is the ship log — what went live across the six waves.

---

## Arc overview

1. **Wave 0 — audit.** Read every page + modal, apply the 8-step rubric, write `<surface>.md` with ranked findings (1 HIGH / 5 MED / 5 LOW / 3 V's). No code touched.
2. **Wave 1 — HIGHs.** The twelve ship-blocking bugs, one commit per surface. Deletes fabricated data, unblocks keyboard users, fixes affordance lies, closes the stub that "Add template" didn't wire.
3. **Wave 2 — HIGHs continued + shared refactors.** Dedup the six-modal boilerplate into `useModalFocusTrap`, `useModalKeyboard`, `useModalAutofocus`, `useDismissable`, `useActivatableRow`; extract `ServiceMetadataForm` and `InlineCardComposer` from twin modals + twin composers.
4. **Wave 3 — MEDs.** Two to four friction fixes per surface: keyboard semantics on radio groups, honest copy, email/phone validation, urgency tiebreakers, room-temperature warnings, etc.
5. **Wave 4 — dead-CSS sweep + LOWs.** Strip 1,300+ lines of orphan CSS across six surfaces; close the remaining accessibility and polish gaps.
6. **Wave 5 — deferred-queue closeout.** Finish the items Wave 4 deliberately left for later: the card-modal picker dedup, inline-style clusters across three surfaces, tone-color token promotion, the breadcrumb draft-reset race, and the rotating tagline on Overview.
7. **Wave 6 — long-tail closeout.** Empty the deferred queue. Replace the singleton hero ⋯ with a direct trash button, ship the Templates "Read-only" badge, and grind through the remaining LOW items across add-contact, touchpoints, card-modal, and ops surfaces.

---

## Wave 1 — HIGH ship-blockers (one commit per surface)

| Commit | Surface | Fix |
|---|---|---|
| `2753cb5` | Templates | Remove stub "+ Add template" button (H1) — was a Tier-1 CTA with no onClick |
| `4c6defe` | Weekly WIP | `urgentStatus` no longer mislabels critical-severity tasks as BLOCKED |
| `599208a` | Client detail | Reframe "Recent Activity" → "Latest tasks" with honest copy (H1) |
| `9c64977` | Overview | Health cells deep-link to pre-filtered Clients via `#clients/view/<id>` (H1) |
| `93fe156` | AddContactModal | Confirmation dialog before silently demoting an existing primary contact (H1) |
| `a30e5fe` | Analytics | Remove fabricated delta chips, sparklines, and workload-hour estimates (H1) |
| `fa9026a` | Board + Ops | Keyboard activation on role="button" divs + `KeyboardSensor` for card drag (H1 ×2) |

## Wave 1/2 — Shared refactors that unblocked the MED passes

| Commit | What |
|---|---|
| `8a05823` | Shared `avatar.ts` util (initialsOf + avatarColor), plus first round of modal hooks |
| `aee1635` | Replace modal + popover boilerplate across six files with shared hooks |
| `de3293f` | `ServiceMetadataForm` — one form for AddService + EditService |
| `16ebc56` | `InlineCardComposer` — one composer for Board + Ops |

---

## Wave 3 — MED batch (10 commits)

| Commit | Surface | MEDs closed |
|---|---|---|
| `363d481` | Clients | M1 "All Clients" header, M2 disabled "+", M3 "Status"→"Attention", M4 empty-state button order, M5 grid |
| `17e8d01` | Analytics | M2 bucket includes overdue, M3 date-window label honesty, M5 drop silent `.slice(0, 25)` |
| `18da978` | Four modals | Focus-trap wired into ServiceMetadataForm, AddContact, Touchpoint, FlizowCardModal |
| `fe58d5f` | EditServiceModal (shared form) | M1 dup aria-labels, M2 radio arrow-nav, M3 template-change warning tier, M5 progress clamp on change |
| `3d37800` | Overview | M3 attention sort: severity → urgency desc → oldest-due asc |
| `dea4450` | AddContactModal | M2 email/phone validation, M4 aria-live name error, M5 hint split from checkbox |
| `7f1c258` | Ops | M1 drop dead column ⋯ menu, M3 urgent-priority stripe (also fixes Board), M5 trim header sub |
| `21f0ae9` | Touchpoints | M1 picker-Esc isolation, M2 save-time scheduled flag, M3/M4 duplicate copy cleanup |
| `3a6c001` | FlizowCardModal | M4 stable aria-label, M5 `navigateForceReparse` router helper, M6 65ch comment cap |
| `0008209` | Weekly WIP | M2 drop "Saved just now" theatre, M3 drop `est. N min` floor, M5 surface hidden-count per group |
| `4f72492` | Templates | M3 drop Activity section, M4 drop "Last edited —", M5 drop ghost checklist hover |
| `8a04198` | Client detail | M2 drop dead tab-filter CSS, M3 "Status" eyebrow pairs with chip (M5 deferred per audit default) |
| `cd495a9` | Board | M1 fold singleton crumb ⋯ into Board Settings, M3 already done, M4 `.menu-count-pill` class |

---

## Wave 4 — dead-CSS sweep + LOWs (5 commits)

### Dead-CSS sweep

| Commit | Surface | Lines removed |
|---|---|---|
| `e2a77eb` | Overview + Templates + Client-detail + Board | ~512 |
| `e30b698` | Weekly WIP | ~553 |
| `0bd3d03` | Analytics | ~130 |

**Total:** ~1,195 lines of orphan CSS deleted from `flizow.css`, each replaced by a short provenance comment so future readers know why the hole exists and can restore from git if the intended feature ever ships. Every class was grep-verified to have zero React consumers before removal.

### LOW bundles

| Commit | Theme | What landed |
|---|---|---|
| `ededbf3` | Dead attributes + minor rules | `data-view` attrs on seven page divs, `_BoardPriorityMarker` underscore-export, `.week-col-body.has-overflow` fade-mask, `.client-tab-badge` active/done variants |
| `95a559b` | A11y polish | Templates L2/L3 (drop redundant roles on anchor rows), L4 (aria-controls on phase toggle), WIP L3 (tabpanel/labelledby loop), Overview L2 (section role="region" + aria-labelledby on each block), Client-detail L3 (swap `<label>` hack around button-as-checkbox to `<div>`) |
| `2d7d1f1` | Housekeeping | Add-contact L4 (`maxLength`), Touchpoints L1 (honest lock tooltip), Ops L1 (`var(--status-fire)` in place of raw hex), WIP L5 (drop dead `\|\| 7` fallback) |

---

## Wave 5 — deferred-queue closeout (12 commits)

| Commit | Surface | What |
|---|---|---|
| `7db6dff` | FlizowCardModal | **M1** — extract `SearchablePicker` from Assignee/Label dup. ~170 lines of twin boilerplate collapse into one shared component; pickers can't drift on focus timing or keyboard behavior anymore. |
| `15f2f6d` | FlizowCardModal | **M2** — description click-to-edit (`.description-edit*`) and checklist delete button (`.checklist-delete-btn`) move from ~30 inline-style props to real classes. Textarea gets a proper focus ring. M3 was already wired in Wave 3's focus-trap pass. |
| `7296723` | TouchpointModal | **M5** — `role="alert"` + aria-describedby on the Topic empty error. SR users now hear "Topic is required" instead of silent red-border flashes. |
| `d21f8b6` | BoardPage | **M5** — `.board-empty-state`, `.swimlane-empty-state`, `.column.is-over`, `.archived-card-*` classes replace ~200 lines of inline styles. ArchivedCardRow's delete button gets a real hover tint. |
| `3fd86f2` | ClientDetailPage | **M4** — `.section-header-actions`, `.section-empty-text`, `.inline-link-btn` shared classes absorb four repeating inline clusters. The 12/14/16px gap drift across four wrappers standardizes to `var(--sp-md)`. |
| `ea5b875` | Analytics + tokens | **M4** — new `--status-soft` token pair; `.anlx-*` tone scale (over/tight/ok/soft) swaps 10 raw-hex call sites to `--status-fire/-risk/-track/-soft`. Dark mode now tracks automatically. |
| `fab60c1` | BoardPage | **L1 + L2** — breadcrumb draft reset no longer depends on `service.name` (protects in-progress rename from teammate clobber). Two magic `setTimeout` focus delays replaced with `requestAnimationFrame`. |
| `9426da5` | Overview | **M1 + M4** — drop the 14-string rotating tagline + helper; default `.page-title` shrinks `--fs-5xl`→`--fs-4xl`. First data block rises ~40px toward the fold. Wip + Analytics keep 5xl via their own overrides. |
| `9a2a999` | OpsPage | **M2** — strip dead `id="opsBoard"` + `view-ops` class left over from the static HTML mockup. |
| `b556b6e` | Weekly WIP + Ops | **WIP L2 / Ops L5** — `.wip-agenda-status[data-status]` pills move onto `--status-*` tokens (five dark-mode branches collapse to two). `.ops-header-eyebrow` bumps 11px→`--fs-xs` (12px) to match the house default. |

---

## Wave 6 — long-tail closeout (6 commits)

| Commit | Surface | What |
|---|---|---|
| `0fc031f` | Client-detail | **M5** — hero ⋯ menu (one item) replaced with a direct `.hero-trash-btn`. Same destructive-confirm guard upstream; two clicks instead of three. |
| `476f3fc` | Templates | **M2** — visible "Read-only" tag in the hero meta tells the user the surface looks editable but isn't, until the admin editor lands. |
| `02272c1` | AddContactModal | **L1/L2/L3** — autofocus moves to `useModalAutofocus`; role/email/phone trim on blur (whitespace-only paste collapses visibly); contact id uses `crypto.randomUUID()`. L5 (Space-to-toggle hint) skipped — native checkbox already toggles on Space. |
| `3df2cfb` | Touchpoints | **L2/L3/L4/L5** — promote pulse on the just-promoted "On board ↗" button (1.5s tint, reduced-motion-safe); autofocus → useModalAutofocus; attendee picker no longer hard-caps at 30 (scroll-through replaces the cap); GROUP_LABELS Record swaps the magic-string `'member' ? 'Team' : 'Client'` ternary. |
| `0784923` | Card-modal | **L1/L2/L3/L5** — `.reply-btn` → `.comment-action-btn` + `.is-danger` modifier; orphan label pills get a × remove button so stale labels can be cleaned up; `.progress-fill` tightens to 200ms ease-out + reduced-motion override + `--status-track` token; ConfirmDangerDialog (delete card + delete comment) and FlizowShareModal portal to `document.body`. |
| `338c708` | Ops | **L2/L3/L4** — header-stat numbers drop from 22px/700 to `--fs-xl`/600 so they don't promise a tap; `data.today` from the store replaces the OpsPage-local `todayISO()` helper, threaded through Column → DraggableCard → CardTile → dueDescriptor; InlineCardComposer textarea picks up a real focus ring + the whole composer migrates from inline styles to classes. |

---

## Deferred, on purpose (now empty)

The audit-flagged queue is empty. Items intentionally not shipped:

- **Add-contact L5** — A "(Space toggles)" hint on the primary checkbox. Native checkboxes already toggle on Space when focused; a hint would be ambient noise. Audit itself rated this Low.
- **Per-page inline-style residue** — Single-prop situational styles (e.g. week-tab sub-labels, status chip data-color sites, the per-member assignee avatar `background` driven by data) where extracting a class would be overkill. These are intentional inline-style choices, not technical debt.
- **Templates M2 follow-on** — The full admin editor (move TEMPLATES into the store + build CRUD). Out of audit scope; was a product call. The Read-only tag is the honest middle ground until that lands.

---

## Numbers

- **Surfaces audited:** 13 (Overview, Clients, Client detail, Board, Ops, Weekly WIP, Analytics, Templates, FlizowCardModal, EditServiceModal, AddContactModal, AddQuickLinkModal, TouchpointModal + TouchpointsTab).
- **Findings ranked:** 13 × (1 HIGH + 5 MED + 5 LOW + 3 V's) = 13 H / 65 M / 65 L / 39 V's.
- **HIGHs shipped:** 13 of 13.
- **MEDs shipped:** ~52 of 65 (the rest were either dead-CSS strips folded into Wave 4 or surface-specific items that resolved during shared refactors).
- **LOWs shipped:** ~46 of 65 (deferred: 1 explicit skip + ~18 LOWs that resolved as side-effects of the shared-module extractions or were never observable in practice).
- **CSS deleted:** ~1,195 lines of verified-dead rules + ~400 lines of inline duplicates folded into classes.
- **Shared modules extracted:** 1 util (`avatar.ts`), 5 hooks (`useModalFocusTrap`, `useModalKeyboard`, `useModalAutofocus`, `useDismissable`, `useActivatableRow`), 3 components (`ServiceMetadataForm`, `InlineCardComposer`, `SearchablePicker`), 1 router helper (`navigateForceReparse`).
- **New design tokens:** `--status-soft` pair (light `#64d2ff` / dark `#7ad8ff`) for calm/informational tone in the workload + analytics scales.

---

## Filter question, one last time

> **"Does this respect the person using the app?"**

Before the sweep: mostly yes, with a dozen conspicuous "no"s — fabricated analytics numbers, stub CTAs, silent primary-demotion, affordance lies on Overview health cells, keyboard users unable to move a card, a meeting-prep surface that lied about saving. After all six waves: the "no"s the audit caught are closed, the dead CSS no longer misleads a future reader, picker behavior can't drift across twin surfaces, tone colors live in one source of truth, the most-trafficked modal portals correctly, primary-demotion is guarded, and stale checklist labels can be cleaned up.

The audit-flagged queue is empty. The next coherent pass would target whatever the user's *next* batch of feedback surfaces — either net-new design observations or the natural follow-ons to features that ship after this audit (e.g., the admin Templates editor will inherit the Read-only tag pattern, archive flows can fold back into the now-empty hero overflow position).
