# Overview Page — Design Audit

**Audited:** 2026-04-24
**Rubric:** `~/Documents/Claude/skills/apple-design-principles.md` (8-step)
**Mode:** Findings only. No fixes applied. Awaiting approval before any change.

---

## Surface in scope

- `src/pages/OverviewPage.tsx` — greeting header + four blocks (Portfolio Health, Needs Your Attention, Schedule, My Boards)
- Shared styles: `.page-header`, `.page-greeting`, `.page-title`, `.page-date`, `.block`, `.block-header`, `.block-title`, `.health-strip`, `.health-cell`, `.attn-card`, `.attn-more`, `.week-tabs`, `.week-board`, `.week-col`, `.week-task`, `.pinned-wrap--inline`, `.pinned-empty`, `.board-chip`

**Not in scope this pass** (audit separately):
- `TopNav` / left sidebar navigation chrome
- Client detail pane reached by clicking an attention card or board chip
- Ops page reached via left-nav

---

## Step 1 — Belief check

**Core belief:** *"The user came to move work forward. Show them what's on their plate, let them change it quickly, and stay out of the way."*

What the user came to Overview for:
- See who's bleeding (Portfolio Health + Needs Attention)
- See what's on the calendar this week and next (Schedule)
- Jump into a board they're actively working in (My Boards)

The page serves these jobs — each block maps to one concrete "what do I do next" question. The block order roughly matches urgency (triage → calendar → active work). **Belief: passing**, with two concerns:

1. The page opens with a three-line header (greeting + big title + rotating tagline) before the user reaches the first data block. That's mood-setting chrome between a professional and their work. See M4.
2. The health-count cells advertise a filtered "View On Fire clients" drill-in but navigate to the unfiltered Clients page. The affordance promises one thing and delivers another. See H1.

---

## Step 2 — 10 HIG principles walk

| # | Principle | Result | Notes |
|---|-----------|--------|-------|
| 1 | Clarity beats cleverness | **Pass with friction** | Rotating tagline adds ambient cleverness with no signal value. See M1. |
| 2 | Interface defers to content | **Pass with friction** | Greeting header at 5xl competes with the first data block for first glance. See M4. |
| 3 | Depth communicates hierarchy | Pass | Blocks are peers, rendered as peers. Correct. |
| 4 | Direct manipulation | **Fail** | Health cells are sold as filterable drill-ins but don't filter. See H1. Block reorder CSS exists but no handle is rendered. See M2. |
| 5 | Immediate feedback | Pass | Health cells have `:hover` tint and `:focus-visible`; attn cards + board chips do too. Week tabs toggle instantly. |
| 6 | Forgiveness | Pass | Overview is read-only. Nothing to undo. |
| 7 | Consistency | Pass with friction | Block header pattern is consistent. Attention sort isn't secondary-ordered by urgency, so two users with the same data can see different "most urgent" cards on subsequent renders if client order changes. See M3. |
| 8 | Metaphor and affordance | **Fail** | `role="button"` + `aria-label="View On Fire clients"` on a cell that doesn't filter = an affordance that lies. See H1. |
| 9 | User control | Pass | Week tabs let users look forward; My Boards reflects their own stars. |
| 10 | Aesthetic integrity | Pass | Calm, professional, legible. |

---

## Step 3 — Blue-tier audit

| Element | Tier | Expected | Actual | Verdict |
|---------|------|----------|--------|---------|
| On Fire health value | — | urgent-accent color | `var(--accent)` via `.health-value.urgent` | ✓ |
| Health cell hover | 3 (tint) | 3 | `var(--hover-tint)` | ✓ |
| Health cell focus ring | 2 (ring) | 2 | `outline: 2px solid var(--hover-blue)` | ✓ |
| Attention card (critical) | — | red/orange accent bar | `::before { background: var(--accent) }` | ✓ |
| "View all N →" link | 4 (text-only inline) | 4 | default link color | ✓ |
| Week-tab active | 3 (tint) | 3 | pass | ✓ |
| `week-task` card hover | — | neutral bg shift | `var(--bg-faint)` + subtle shadow | ✓ |
| Board-chip hover | — | neutral | pass | ✓ |
| Board-chip focus | 2 (ring) | 2 | pass | ✓ |
| Pinned empty CTA ("Browse clients →") | 4 (text-only inline) | 4 | pass | ✓ |

No tier collisions. Blue usage is disciplined.

---

## Step 4 — Grids and spacing

**On-grid.**
- `.page-header` spacing: `margin-bottom: 8px`, `margin-bottom: 6px` — close to 8 rhythm; 6px is a reasonable half-step.
- `.health-strip` padding: `32px 36px` ✓
- `.health-cell` gap: `var(--sp-18)` (18px — on the internal-card scale) ✓
- `.attn-card` spacing driven by tokens ✓
- `.week-col-header` padding: `16px 16px 12px` ✓
- `.week-col-body` padding: `var(--sp-md)` ✓

**Off-grid.**
- Week-tab sub-label: `marginLeft: 6` (inline style, line 255 + 265). Should be `4` or `8`. See L4.
- Empty-attention inline style: `padding: 24, fontSize: 14`. 24 is on-grid; `fontSize: 14` is close enough to `--fs-base` (14px) that it's fine, but using the token would survive a scale change. See L1.

**Line length.**
- Tagline pool max length: "Your priorities, front and center." = 36 chars. Well under 75. ✓
- Attention `attn-title` is a short phrase ("3 overdue cards", "Blocked: waiting on brand assets") — all under 50 chars. ✓

**Typography.**
- `.page-title` → `--fs-5xl` (32px). Defensible for a page title but see M4 for the aggregate-header critique.
- `.health-value` → `--fs-6xl` (36px) — biggest number on the page is the thing we want the user to see first. Good use of type scale for hierarchy.

---

## Step 5 — 10-question checklist

| # | Question | Answer |
|---|----------|--------|
| 1 | Purpose — clear in 5 seconds? | **Yes.** Four titled blocks tell the user exactly what this page is. |
| 2 | Hierarchy — important thing most prominent? | **Mostly.** "Good afternoon, Nikko" is more prominent than the On Fire count, which is the actual urgent signal. See M4. |
| 3 | Clarity — every button/link has one meaning? | **No.** Health cells promise filtered navigation but deliver unfiltered. See H1. |
| 4 | Feedback within 100ms? | Yes. |
| 5 | Forgiveness — can user undo? | N/A (read-only page). |
| 6 | Consistency — matches app patterns? | Yes. |
| 7 | Accessibility — keyboard / reader / reduced motion? | Mostly. Health cells + attn cards are keyboard-operable. Blocks lack landmark roles. See L2. |
| 8 | Speed — under 1.5s first paint? | Expected yes. Memoized computations, no heavy renders. |
| 9 | Respect — works for user or makes user work? | Works for the user, with two papercuts (H1 lies about navigation; M4 costs ~1 glance before real content). |
| 10 | Matches core belief? | Mostly. Tagline is the main belief violation — ornament in front of work. |

---

## Step 6 — Ranked findings

### HIGH — ship-blocking

**H1. Health-cell navigation doesn't match its aria-label.**
All three health cells (On Fire, At Risk, On Track) set `aria-label="View On Fire clients"` / `"View At Risk clients"` / `"View On Track clients"` but their `onClick` calls `navigate('#clients')` — the unfiltered Clients page. The router has no support for status query-strings (`src/router.ts`, full file), and the Clients page holds `activeView` in local `useState` (`ClientsPage.tsx:46`), so there's no way for the caller to pre-select a chip. Three problems at once:

1. **Direct manipulation failure.** The cell looks like a filterable drill-in; it isn't.
2. **Screen-reader lie.** SR users hear "View On Fire clients," tab + enter, and land on the unfiltered page. Trust broken.
3. **Wasted click.** The sighted user then scans the Clients page, manually clicks the "On Fire" chip, and arrives where they expected to land one click ago.

- Files: `src/pages/OverviewPage.tsx:159, 168, 181` (the `navigate('#clients')` calls); `src/router.ts` (no status param supported); `src/pages/ClientsPage.tsx:46` (local useState filter)
- Fix options:
  - **(a) Match the label to the behavior.** Change the aria-label to "Open Clients page" and accept the cell is a page-level link, not a filter. Cheap, honest, but loses the drill-in intent.
  - **(b) Match the behavior to the label** (recommended). Thread a status param through the URL (`#clients/fire`, or a query-string scheme). Router parses it into `params.status`; Clients page reads `route.params.status` into its `activeView` initializer. Solid fix, ~30 lines of code touching `router.ts`, `ClientsPage.tsx`, and the three `navigate(...)` calls here. Also unlocks shareable filtered URLs.
- Default recommendation: **(b).** The code surface is small and the UX win is direct.

### MED — friction, fix soon

**M1. Rotating tagline is ornament above a utility dashboard.**
Below the greeting and title sits a rotating tagline ("Here's what needs you today.", "Let's make today count.", 12 others) that rotates by `dayOfYear % 14`. It carries no signal — it's decoration. "The interface defers to the content" (HIG #2). On a page whose job is to show the user urgent work, the first thing below the fold is a mood-setter with no actionable information.

- File: `src/pages/OverviewPage.tsx:13-28` (TAGLINES array), `:41-45` (taglineForDay helper), `:143` (render)
- Fix options:
  - **(a) Replace with a live status line** — e.g., "3 clients need you today · 2 meetings this week". Actionable, matches belief, earns the space.
  - **(b) Drop it entirely.** The greeting line "Thursday, April 24" + the title "Good afternoon, Nikko." is already plenty of welcome.
  - **(c) Keep it, but only on Monday or the first visit of the day.** Reduces it from chrome-every-day to an occasional flourish.
- Default recommendation: **(a) → fallback (b).** Live numbers pull double duty.

**M2. Block-drag system is half-built.**
`flizow.css:5731-5800` defines `.block-drag-handle`, `.block:hover .block-drag-handle` reveal, `.block.is-dragging`, `.block.drop-above`, `.block.drop-below` — a complete drag-to-reorder system for Overview blocks. No React code renders a handle, and `useFlizow()` has no `reorderBlocks` action. Either the feature was half-shipped and abandoned, or it's planned for a future pass.

- Files: `src/styles/flizow.css:5731-5800` (dead CSS), `src/pages/OverviewPage.tsx` (no handle JSX)
- Fix options:
  - **(a) Ship the feature** — add a drag handle in the block header, wire a store action, persist order. Nice future-you gift, but a real undertaking.
  - **(b) Delete the CSS** until the feature ships. ~70 lines of CSS removed, plus consistent signal that the page doesn't promise reordering.
- Default recommendation: **(b).** Same reasoning as the disabled "+" button in Clients M2 — a half-built affordance is worse than no affordance.

**M3. Needs-Attention sort has no tiebreaker.**
`buildAttentionCards()` at line 551-621 returns `[...fire, ...risk]` in the order `data.clients` returned them. If three clients are "on fire," the one with 7 overdue cards might appear *below* the one with 1 overdue card just because of array order. The user's first instinct is to scan top → bottom; the most urgent should be at the top.

- File: `src/pages/OverviewPage.tsx:551-621`
- Fix: after the severity split, secondary-sort each bucket by `(overdue.length + blocked.length)` desc, tertiary by oldest due date asc. ~6 lines.
- Urgency matters because the block caps at 6 cards — a truly-urgent client hiding at position 7 is invisible until the user clicks "View all."

**M4. Three-line header pushes actionable blocks below the fold.**
The stacked `page-greeting` (md, uppercase) + `page-title` (5xl, 32px) + `page-date` tagline (lg, ~16px) takes roughly 120–140px of vertical real estate before the first Portfolio Health number. On a 900px viewport that's ~15% of the viewport spent on mood-setting before the user sees their fire count. Apple's own macOS dashboards (e.g., Reminders, Mail) lead with a quieter header because the content is the point.

- File: `src/pages/OverviewPage.tsx:140-144`
- Fix options:
  - **(a) Collapse to two lines.** Drop the tagline (see M1), keep "Thursday, April 24" (eyebrow) + "Good afternoon, Nikko." (title).
  - **(b) Reduce title size** from `--fs-5xl` (32px) to `--fs-4xl` (28px). Less aggressive than M1's fix, still tightens the header.
  - **(c) Do both.** ~40px saved, first data block rises toward the fold.
- Default recommendation: **(c).**

**M5. Orphan `.wipnext-*` CSS from deleted Block 3.**
`flizow.css:5881-5930` + `:6771-6777` defines a full `.wipnext-strip` system (wipnext-strip, wipnext-divider, wipnext-cell, wipnext-when, wipnext-num, wipnext-sub) with no React consumers. The comment at line 5881 labels it "BLOCK 3: WEEKLY WIP PREVIEW — mirrors Agenda tab counts." The React page skips from Block 2 to Block 4, confirming this is dead code from a removed block.

- File: `src/styles/flizow.css:5881-5930, 6771-6777` (~55 lines)
- Fix: delete the orphan rules. Verify no other page uses them (`grep wipnext` in `src/` returned zero matches outside this file).
- Not technically user-visible, but CSS debt grows faster than JS debt — worth cleaning on the pass.

### LOW — polish

**L1. Inline styles where a class would fit the file convention.**
- `OverviewPage.tsx:195` — empty-attention: `{ padding: 24, color: 'var(--text-soft)', fontSize: 14 }`
- `OverviewPage.tsx:232` — attn-more: `{ textDecoration: 'none' }`
- `OverviewPage.tsx:247` — week-tabs container: `{ display: 'flex', alignItems: 'center', gap: 12 }`
- `OverviewPage.tsx:255, 265` — week-tab sub-labels: `{ fontWeight: 400, color: 'var(--text-soft)', marginLeft: 6 }`

A `.attn-empty`, `.week-tabs-wrap`, `.week-tab-sub` trio in CSS would move four inline-style blocks into class land. Low priority, but matches the rest of the file.

**L2. Blocks lack landmark roles for screen-reader nav.**
Each `<div className="block">` is a top-level logical region but renders as a plain div. Screen reader users can't jump between blocks with R / landmark shortcuts. Fix: `<section role="region" aria-labelledby="block-{id}-title">` wrapping each block, with the block title element getting a matching `id`. Four touchpoints, ~12 lines total.

- File: `src/pages/OverviewPage.tsx:147, 189, 244, 308`

**L3. Dead `.week-col-body.has-overflow` fade-mask.**
`flizow.css:6416` defines a nice gradient fade-mask for when a week column has too many items to fit. No JS ever sets `has-overflow` on `.week-col-body`. Long-tail overflow in a packed Friday means items just scroll under the column bottom with no visible cue. Either wire it (ResizeObserver or a scroll-height check) or delete it.

- Files: `src/styles/flizow.css:6416-6418`; `src/pages/OverviewPage.tsx` (no overflow-detection JS)

**L4. Off-grid `marginLeft: 6` on week-tab sub-label.**
Lines 255, 265. Not on the 4/8 grid. Should be `4` (tighter, `--sp-4`) or `8` (looser, `--sp-base`). Minor.

**L5. Tagline-array + helper could move to a util file.**
`TAGLINES` (line 13-28), `taglineForDay()` (line 41-45) — if M1 is fixed by dropping the tagline, this is moot. If it's kept as a status-line, the logic also leaves this file.

---

## Open verifications

**V1. Behavior in the deployed app.** Does clicking an On Fire / At Risk / On Track health cell land on the unfiltered `#clients` page (confirming H1's diagnosis from code) or does something else happen in practice (e.g., filter state bleeds across navigation from a prior visit)? 30-second live check.

**V2. Week-col overflow in practice.** If a day (e.g., end-of-quarter Friday) has 6+ items, does the column scroll with a scrollbar, clip silently, or push its neighbors? Needs a live test with seeded dense data or a temporary CSS height constraint.

**V3. Attention cap vs "View all" link.** When `hiddenAttention > 0`, the link text reads "View all 9 →". Clicking it goes to `#clients` (unfiltered) — same H1 concern, different surface. Flagging here; the fix in H1 solves both.

---

## Step 7 — Verify
N/A — no fixes applied in this pass.

## Step 8 — Ship
N/A — this pass is findings-only. Ship gate re-runs after fixes land.

---

## Filter question

**Does the Overview page respect the person using it?**

Mostly yes. The block layout respects the jobs the user came to do. Two things bruise it: the health cells lie about where they go (H1), and the header spends ~140px on pleasantries before the user sees their work (M1 + M4). Fix those two, and the page moves from "respectful" to "earns its place as the home screen."

---

## Suggested next action

Pick a direction: "fix H1 and the M's" (or "fix all" / "fix H1 only" / "move to next page, I'll batch fixes later"). LOWs and V's can be batched or deferred. If you want me to keep auditing, the next page in order is **Client detail / Board** (the pane reached by clicking any client).
