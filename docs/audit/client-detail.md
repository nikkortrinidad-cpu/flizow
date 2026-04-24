# Client Detail Page — Design Audit

**Audited:** 2026-04-24
**Rubric:** `~/Documents/Claude/skills/apple-design-principles.md` (8-step)
**Mode:** Findings only. No fixes applied. Awaiting approval before any change.

---

## Surface in scope

- `src/pages/ClientDetailPage.tsx` (2933 lines) — hero, tabs, Overview tab contents (Attention, Services, Activity), Onboarding tab, About tab (Contacts, Quick Links, Team)
- `src/pages/ClientsSplit.tsx` — the thin wrapper that hosts `ClientsPage` + `ClientDetailPage` side-by-side
- Shared styles: `.client-detail-page`, `.client-hero`, `.hero-*`, `.client-tabs-row`, `.client-tab`, `.detail-section`, `.attention-chip`, `.service-card`, `.activity-list`, `.relationship-card`, `.contact-row`, `.team-member-card`, `.onboarding-service-card`, `.onboarding-item`

**Not in scope this pass** (audit separately):
- `AddServiceModal`, `AddContactModal`, `AddQuickLinkModal`, `AddOperatorModal` (sub-surfaces — same file but modal audit pass)
- `ConfirmDangerDialog` (reusable component, audit once)
- `NotesTab`, `TouchpointsTab`, `StatsTab` (each their own component file)
- Board page (`#board/{id}` — reached from here, but its own audit)

---

## Step 1 — Belief check

**Core belief:** *"The user came to move work forward. Show them what's on their plate, let them change it quickly, and stay out of the way."*

What the user came to the client detail for:
- See this specific client's state at a glance (hero + attention strip)
- Drill into a service board (service cards are links)
- Update setup status (Onboarding checklist)
- Find a contact, link, or team member (About tab)
- Log a note or meeting (Notes / Touchpoints)

The page mostly delivers. Hero is rich with the meta that matters (industry, AM, client-since, MRR + renewal). Attention strip points at the first overdue service, so one click goes somewhere useful. Inline rename is clean. Delete cascade counts are honest and specific.

**Two belief violations worth naming:**
1. "Recent Activity" is synthesized from task `createdAt` and dressed up with action-verbs ("Sam started", "moved to review") — but a task created 6 months ago that moved to review yesterday will display "Sam moved to review" with a 6-month-old timestamp. The label claims authority ("Recent Activity") but the data is stale and the verbs are guessed. See H1.
2. Overflow menu is a three-dot menu holding exactly one item ("Delete client…"). Menu shape promises multiple actions; reality is a single destructive one. Either seed the menu with at least one more action (Archive, Duplicate) or drop the menu and use a plain icon button + confirm. See M5.

---

## Step 2 — 10 HIG principles walk

| # | Principle | Result | Notes |
|---|-----------|--------|-------|
| 1 | Clarity beats cleverness | **Pass with friction** | "Recent Activity" label over synthesized data is the opposite of clarity. See H1. |
| 2 | Interface defers to content | Pass | Hero is balanced; section titles are uppercase-eyebrow, content carries weight. |
| 3 | Depth communicates hierarchy | Pass | Tabs → sections → cards is a clean three-tier depth story. |
| 4 | Direct manipulation | Pass | Inline rename on hero name, double-click rename on onboarding items, direct check-off, pin-favorite-in-place. Well done. |
| 5 | Immediate feedback | Pass | Hover, focus, pressed, checked all have states. Save is instant (store writes + debounced Firestore). |
| 6 | Forgiveness | **Pass with friction** | Destructive actions are guarded (delete service/client both confirm with cascade counts). Onboarding item × has no confirm — defensible for low-cost data, flagged as an intentional call. |
| 7 | Consistency | **Pass with friction** | Edit-mode pattern ("Edit" button flips the section into manage-mode with × buttons + reorder arrows) is applied well in Services, Contacts, Quick Links, Team — but the wording differs ("Edit", "Done"). Pattern is fine; stay consistent. |
| 8 | Metaphor and affordance | Pass with friction | Inline-edit cursor hint ("Click to rename") works; status chip has a tooltip the user probably won't see. See M3. |
| 9 | User control | Pass | All edits reversible, Escape cancels inline fields, non-primary contact row is a full button, AM change surface lives in separate modal. |
| 10 | Aesthetic integrity | Pass | Calm, professional, consistent with rest of app. |

---

## Step 3 — Blue-tier audit

| Element | Tier | Expected | Actual | Verdict |
|---------|------|----------|--------|---------|
| "+ Add service" toolbar button | 4 (text-only link) | 4 | `.detail-section-link` — blue text, no bg | ✓ |
| "Edit" / "Done" link | 4 | 4 | same | ✓ |
| Service card (clickable body) | 3 (tint on hover) | 3 | `.service-card:hover` shifts bg | ✓ |
| Service card favorite (star) pinned | — | filled yellow (not blue) | `fill="currentColor"` via aria-pressed CSS | ✓ — star is a separate color family |
| Attention chip (fire) | — | red tint | `.attention-chip.fire` with status-fire | ✓ |
| Attention chip hover | 3 | — | `translateY(-1px)` + border shift, no blue | ✓ (non-blue, neutral lift) |
| Tab (active) | 3 | 3 | `color-mix(var(--highlight) 12%)` | ✓ |
| Tab hover | 3 | 3 | `color-mix(var(--highlight) 7%)` | ✓ (lighter tint, consistent) |
| Inline rename focus ring | 2 | 2 | `boxShadow: 0 0 0 3px var(--highlight-soft)` | ✓ |
| Delete confirm button (in dialog) | — | red/danger | handled by `ConfirmDangerDialog` — out of scope | ✓ |

No tier collisions. One note: the solid tier-1 CTA doesn't appear anywhere on this page — the primary action is "open service board" (row-as-link), which correctly uses tier 3. The toolbar "Add service" is intentionally tier 4 because it's secondary to the main scan-the-services job. Solid.

---

## Step 4 — Grids and spacing

**On-grid.**
- `.client-detail-page` padding: `var(--sp-36) var(--sp-4xl) 96px` ✓
- Hero padding: `28px 32px` ✓ (on 4 grid)
- `.hero-name` → `var(--fs-4xl)` (28px, tuned for this surface) ✓
- `.detail-section` margin-bottom: `36px` ✓
- `.detail-section-header` margin-bottom: `10px` — close to 8, acceptable

**Off-grid / judgment calls.**
- Hero name inline style: `padding: '2px 8px'`, `padding: '0 4px', margin: '0 -4px'` — 2px is sub-grid but justifiable for the inline-rename's tight visual footprint. Inline styles though, see M4.
- `.hero-meta` gap: `var(--sp-18)` (18px — card-internal token) — consistent with other surfaces.
- `.client-tabs-row` margin: `4px 0 28px` — 4 is off-4 grid, probably wants 0 or 8. Minor.
- Gaps inside button groups: `gap: 12`, `gap: 14`, `gap: 16` used at least four different places. See L2.

**Line length.**
- Hero name (28px) with 240px min-width and flex-wrap — fine for typical names.
- `.hero-meta` text is a 13px row of short facts separated by 3px dots. Reads as a data strip, which is what it should be.
- Section subs like "1 account manager · 2 operators" are well under line-length concern (35 chars).

**Typography.**
- `.hero-name` → `--fs-4xl` (28px) — ≤ page titles elsewhere (5xl), correctly positioned as "client identity" not "page name."
- `.detail-section-title` is uppercase 13px — lifts as eyebrow, not title. Matches Apple's "section lead" pattern.

---

## Step 5 — 10-question checklist

| # | Question | Answer |
|---|----------|--------|
| 1 | Purpose — clear in 5 seconds? | **Yes.** Hero tells you who, the tabs tell you what. |
| 2 | Hierarchy — important thing most prominent? | **Yes.** Hero → attention → services → activity. Onboarding is behind a tab, right where a semi-frequent action should live. |
| 3 | Clarity — every button/link has one meaning? | **Mostly.** Status chip's "auto-computed" explanation is tooltip-only. See M3. Overflow menu with one item confuses shape-as-signal. See M5. |
| 4 | Feedback within 100ms? | Yes. |
| 5 | Forgiveness — can user undo? | **Mostly.** Inline rename has Esc; checklist has toggle; delete has confirm with cascade count. Onboarding item deletion has no confirm — intentional for low-cost data. |
| 6 | Consistency — matches app patterns? | Yes. Same edit-mode pattern (Edit ↔ Done + × buttons) across Services, Contacts, Links, Team. |
| 7 | Accessibility — keyboard / reader / reduced motion? | **Mostly.** Tabs are `role="tablist"` with `aria-selected`; inline fields have `aria-label`s; checkboxes use `role="checkbox"` + `aria-checked`. Onboarding row wraps in `<label>` without targeting a form control — semantically fuzzy. See L3. |
| 8 | Speed — under 1.5s first paint? | Expected yes. Memoized joins; no heavy renders. |
| 9 | Respect — works for user or makes user work? | Works for the user. Two papercuts (H1 stale activity, M3 invisible tooltip). |
| 10 | Matches core belief? | Mostly. H1 violates the "honest data" assumption. |

---

## Step 6 — Ranked findings

### HIGH — ship-blocking

**H1. "Recent Activity" misrepresents state.**
`ActivitySection` at `ClientDetailPage.tsx:1006-1055` renders up to 5 tasks sorted by `createdAt`, wraps each in an action-verb based on current column (`verbFor()` at line 1093 returns "started" if in Progress, "moved to review" if in Review, "flagged a blocker on" if Blocked), and displays the time as `quickTime(task.createdAt, todayISO)`. A task created 6 months ago that moved to Review yesterday will render as:

> **Sam** moved to review "Campaign brief"        *Feb 10*

Three problems:
1. **Label lies.** Header reads "Recent Activity" — this is neither recent nor activity, it's "newest tasks, relabeled with their current column verb."
2. **Verb-timestamp mismatch.** The verb describes what happened (eventually), the timestamp describes when the task was created. The two are decoupled and the user has no way to know.
3. **Comment admits the sin.** Line 1014: *"We don't have a real activity log yet — synthesize a light feed from the latest task events for this client so the section doesn't stay empty. This gets ripped out the moment activity logging lands."* The intent was honest, but the shipped surface isn't.

- File: `src/pages/ClientDetailPage.tsx:1006-1114`
- Fix options:
  - **(a) Rename + reframe** (recommended short-term). Change the section title to "Latest tasks" or "Recent cards", drop the fake verbs, show `title + column label + created N days ago`. Honest and still fills the space.
  - **(b) Ship it empty** until real activity logs exist. Line 1020 already handles empty state: "Nothing logged yet. As the team works, this feed will fill in." Just always show that message.
  - **(c) Wait for real activity data** then wire it properly. The best fix but weeks away.
- Default recommendation: **(a).** Reframes to honest data in ~20 lines; keeps the section useful until the real log ships.

### MED — friction, fix soon

**M1. Dead CSS in hero.**
Multiple rule sets defined, no React consumer:
- `.hero-kebab`, `.hero-kebab-wrap`, `.kebab-menu`, `.kebab-menu-item`, `.kebab-menu-item.danger`, `.kebab-menu-divider` (`flizow.css:7190-7251`) — the hero uses `.hero-overflow` + `.tb-btn` + `.tb-menu` instead.
- `.hero-actions`, `.hero-btn`, `.hero-btn.primary`, `.hero-btn.icon-only` (`flizow.css:7381-7396`) — no `.hero-actions` or `.hero-btn` anywhere in JSX.
- `.hero-logo[data-editable="true"]`, `.hero-logo-overlay`, `.hero-logo[data-has-image="true"]` (`flizow.css:7317-7342`) — no logo upload flow exists. Search for `data-editable`, `data-has-image`, `hero-logo-overlay`, `onUploadLogo` returns only the dead CSS.
- `.detail-breadcrumb` + `.detail-breadcrumb a` + `.detail-breadcrumb .sep/.current` (`flizow.css:7162-7174` and `:10772`) — no breadcrumb is rendered anywhere.

Total: ~110 lines of CSS that do nothing.

- Files: `src/styles/flizow.css` (ranges above)
- Fix: delete. Re-add only when the corresponding JSX ships.

**M2. Duplicate tab-filter logic.**
Tab switching does BOTH conditional rendering AND CSS-attribute filtering:
- React: `{activeTab === 'about' && <AboutSection />}` — only mounts when active.
- CSS: `.client-detail-page[data-active-tab="about"] .detail-section:not([data-tab~="about"]) { display: none; }` — hides non-matching sections (lines 7591-7596, one rule per tab).

Given React unmounts non-active tabs, the CSS rules can never match a mounted section that isn't already in scope — the filter is doing nothing. Pick one:

- **(a) Keep React, drop CSS** (recommended). Delete lines 7591-7596. Six lines gone. React handles everything.
- **(b) Keep CSS, drop React conditionals** — render all tab contents, let CSS show/hide. Faster tab switching (no remount), but pays in initial render cost for every client click.

Default: **(a).** Simpler, matches how React convention reads.

**M3. Status chip's "auto-computed" disclosure is tooltip-only.**
`<span className={`status-chip ${client.status}`} title="Auto-computed from attention items, onboarding progress, and activity">` (line 442). The chip looks clickable (colored pill), the user tries to click to change status, nothing happens, hover-tooltip (~500ms delay) eventually explains. Two user encounters before the user learns the chip is derived.

- File: `src/pages/ClientDetailPage.tsx:440-446`
- Fix options:
  - **(a) Visible eyebrow label.** `<span className="status-chip-wrap">Status · <span class="chip" ...>On Fire</span></span>` — the word "Status" + the chip together signal read-only state.
  - **(b) Remove the hover-hint and rely on Notes / Touchpoints as the explanation** (worse — still invisible).
  - **(c) Move the explanation into the section header, not the chip.** Let `.detail-section-sub` carry "As of this morning · auto from attention, onboarding, activity."
- Default recommendation: **(a).** Cheapest fix, respects the signal.

**M4. Massive inline-style blocks across the file.**
Grep-level observation: the file has 40+ inline `style={{ ... }}` objects across hero, sections, cards. Representative examples:
- Lines 401-411 (hero rename input styling)
- Lines 427-435 (hero rename span mouse handlers mutating `currentTarget.style`)
- Lines 516-521 (overflow menu button)
- Lines 595, 749, 1026, 1155, 1174 (empty-state placeholder padding/fontSize/color)
- Lines 755-764, 1771-1778, 1948-1954 (inline underline-button styling for "Add the first person / client / link")
- Lines 787, 1618, 1746, 1920 (right-aligned button groups)

Cost:
- Theme drift risk — an `fontSize: 14` on line 595 won't follow a global `--fs-base` change.
- Mouse-event style mutation on line 434-435 overrides CSS :hover and makes the interaction non-obvious when reading CSS in isolation.
- Screen-reader high-contrast + OS theme overrides may miss these inline colors.

- Fix: extract the recurring patterns into classes — `.section-empty-text`, `.link-button`, `.header-actions-right`, `.hero-rename-input`, `.hero-rename-text`. Roughly 10 new class declarations eliminate 80% of the inline-style weight.

**M5. Overflow menu holds one item.**
The `⋯` menu at hero top-right (lines 500-541) opens to reveal a single "Delete client…" item. Menu UI chrome (button + dropdown + outside-click listener + Esc handler + aria-expanded plumbing) = 40 lines of wiring for one destructive action. The menu shape visually promises "a handful of options" and under-delivers.

- Files: `src/pages/ClientDetailPage.tsx:317-341, 500-541`
- Fix options:
  - **(a) Replace with a trash icon button + confirm dialog.** Direct manipulation; same destructive-confirm guard. ~15 lines of code shrinks to ~8.
  - **(b) Seed the menu with 2–3 more items** (Archive, Duplicate client, Export). Matches the shape. Best long-term — but only worth it if those actions are coming soon.
  - **(c) Keep as-is.** Fine today; revisit when more actions land.
- Default recommendation: **(c) for now, promote to (b) when Archive ships; fall back to (a) if Archive + Duplicate + Export aren't on the roadmap.** Pick based on roadmap.

### LOW — polish

**L1. `.client-tab-badge` CSS is dead.**
`flizow.css:7570-7587` defines a full badge system (base, active-tab, done variant) for tabs. React renders `<button className="client-tab">{tab.label}</button>` — no badge element, no count. Dead decoration system.

- Fix: delete until the feature (likely "unread count" or "has-attention" marker on tabs) ships.

**L2. Magic gap values across right-aligned button groups.**
Four different values for the wrapper around the right-side buttons:
- `gap: 12` (line 787, Services edit wrap)
- `gap: 14` (lines 1746, 1920, Contacts/Links edit wrap)
- `gap: 16` (line 1618, Team edit wrap)
- Also `gap: 8, gap: 12` scattered across modals.

Standardize on `var(--sp-base)` (12) everywhere, or a named `--sp-section-actions: 14px`.

**L3. `<label>` wraps a button, not a form control.**
`OnboardingRow` uses `<label className="onboarding-item ...">` containing a `<button role="checkbox">` (not a real input) + a label `<span>`. Labels are supposed to associate with form controls; screen readers expect `<label for="...">` or `<label><input/></label>`. VoiceOver + NVDA may read this correctly because of the `role="checkbox"`, but it's a weird semantic because `<label>` around a button-as-checkbox is a hack.

- File: `src/pages/ClientDetailPage.tsx:1369-1448`
- Fix options:
  - **(a) Change `<label>` to `<div>`** — keeps every behavior, drops the label semantics that don't map.
  - **(b) Make the checkbox a real `<input type="checkbox">`** with the visual styling on the paired label. More work, but the idiomatic fix.
- Default: **(a).** 1-line change, solves the lint.

**L4. Magic `setTimeout` delays for focus management.**
- `setTimeout(..., 20)` on hero-name input (line 353)
- `setTimeout(..., 40)` on onboarding-rename input (line 1338)
- `setTimeout(..., 40)` on onboarding-add input (line 1471)
- `setTimeout(..., 80)` on add-service-modal name input (line 2227)

All four are "wait N ms for the DOM to settle before focusing." The values are guesses — 20ms works empirically, 40ms is safer, 80ms is a vibe. Consolidate on one rule-of-thumb (`requestAnimationFrame` + `.focus()` works more reliably than any setTimeout), or document the reason for each delay next to the call.

**L5. Unused `useRouter` / unused helpers possibility.**
Haven't grepped every helper but `deriveInitialsLocal` at line 296 is explicitly flagged in its own comment as "if a third shows up, move this to src/utils." Worth a sweep to see if `clientDerived.ts` already has something equivalent to consolidate.

---

## Open verifications

**V1. Does "Recent Activity" feel misleading in practice?** Open a client whose most recently-created task is a month+ old and is now in Review or Done. Check whether the rendered line reads as honest ("Tasked created last month") or as stale ("Sam moved to review last month" — but actually moved yesterday).

**V2. Does the overflow menu clip on narrow viewports?** The menu is absolutely-positioned with `top: 16, right: 16`. On a narrow split-pane layout, does the dropdown escape the right edge of the detail pane? Verify at 1100px and 900px total widths.

**V3. Does double-click-to-rename compete with the row's click-to-toggle on onboarding items?** The row is clickable via the `<label>` wrapper (toggles the checkbox). The label's inner `<span>` listens for `onDoubleClick` to enter edit mode. Both fire — single click toggles the item off, then the second click of the "double" toggles it back on, then edit mode activates. The user sees a flicker. Verify on a real device; may need to swallow the first click with `onMouseDown preventDefault`.

---

## Step 7 — Verify
N/A — no fixes applied in this pass.

## Step 8 — Ship
N/A — this pass is findings-only. Ship gate re-runs after fixes land.

---

## Filter question

**Does the Client detail page respect the person using it?**

Yes, with two discounts. The page is rich with useful data, direct-manipulation interactions are everywhere you'd want them, the destructive cascade is honest and guarded. The discounts: H1 (Recent Activity looks truthful but isn't) and M5 (a menu that promises multiple options delivers one). Fix those and the page moves from "competent" to "trusted."

---

## Suggested next action

Pick a direction: "fix H1" (~20-line rename + reframe of ActivitySection), "fix all MEDs" (includes ~110 lines of dead-CSS cleanup), or "move on" to the next page. Next in order: **Board page** (`#board/{id}`, `src/pages/BoardPage.tsx`, 2258 lines) — the Kanban surface reached by clicking a service card.
