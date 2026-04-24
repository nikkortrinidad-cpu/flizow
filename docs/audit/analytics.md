# Audit — Analytics page (`#analytics`)

Scope: `src/pages/AnalyticsPage.tsx` (1404 lines) plus the `.anlx-*`
block in `src/styles/flizow.css` (~650 lines, roughly 12503-13160).
Filter popovers render inline via `AnalyticsFilterPill` — not a
separate component. Drill-down panels are rendered inline too.

Rubric: `~/Documents/Claude/skills/apple-design-principles.md`
(belief → 10 HIG → blue tiers → grids → checklist → ranked findings →
verify → ship).

---

## 1. Core belief

**Analytics is where Nikko decides.** Monday morning he opens this
page to pick: *who needs help, what's slipping, which client's on
fire, what's landing this week.* Every number on this screen either
shapes a decision in the next 90 seconds or it's dead weight. The
page's job is to be *honest and fast enough to act on*.

---

## 2. The 10 HIG principles against this page

1. **Clarity.** Section titles (*Delivery health*, *Upcoming
   deliverables*, *Team workload*) name what's in them. KPI labels
   are short and plain. Foot text qualifies the headline. Good —
   **but see H1 for a catastrophic exception**: the sparklines and
   delta chips display fake numbers as if they were trend data.
2. **Deference.** The page chrome is quiet: muted filters, thin
   hairlines, content-forward KPIs. Deference honored.
3. **Direct manipulation.** KPI cards are clickable buttons that
   toggle an inline drill panel. Workload rows are clickable
   buttons that open a per-member drill. No "details" link, no
   modal. Drill into the number on the page where you saw it.
   Strong.
4. **Feedback.** KPI card has `.is-open` state, workload row
   has `.is-open` state + chevron rotation, filter pills
   carat-flips on open. Immediate feedback for every click.
5. **Forgiveness.** Filters have Reset button, Esc closes drill
   panels, filter popovers dismiss on outside click. No
   destructive actions on this page so forgiveness scope is
   small, but what's there is correct.
6. **Consistency.** Reuses the shared page-greeting / page-title /
   page-date header. Drill panel pattern is consistent between
   KPI drill and member drill (V2 below). Filter pills have a
   unified shape.
7. **Hierarchy.** Page title at `--fs-5xl`, KPI values at ~40px,
   section titles ~18px, row titles ~14px. Clear scale.
8. **Motion.** Drill panel slides open with `max-height` easing.
   Chevron rotates. Filter popover fades. All within house
   150-400ms budget.
9. **Accessibility.** Decent. `role="list"` / `role="listitem"`
   on the KPI grid, `role="tablist"` / `role="tab"` on upcoming
   buckets, `aria-expanded` on drill triggers, `aria-label` on
   close buttons. Filter popovers use `role="listbox"` +
   `role="option"`. Most interactive elements are buttons/links
   with real HTML semantics. Keyboard Tab → Enter / Space → open
   works. One gap: focus-visible ring is only wired on
   `.anlx-wl-row`; not on `.anlx-drill-row` or `.anlx-up-row`
   (L4).
10. **Speed.** All major lists memoized, workload built once per
    task change, KPIs derived off a single filtered array.
    Sparkline paths recompute every render (negligible).

---

## 3. Blue-highlight tier check

- **Solid CTA** — nothing. Analytics is a read page; no commit
  actions.
- **Ring** — filter pill `.is-active` gets a highlight-tint
  background; drill close button hover. Reset button hovers to a
  6% highlight tint. Tier honored.
- **Tint** — KPI card `.is-open` gets a highlight border; workload
  row `.is-open` chevron turns blue. Tier honored.
- **Text-only** — drill rows and upcoming rows are implicit blue
  on hover, but the page doesn't use text-only blue inline links
  heavily. N/A.

Tier usage matches the hierarchy. No violations.

---

## 4. Grid / layout audit

- Page max-width 1240px, centered, `--sp-36` top / `--sp-4xl`
  sides / 96px bottom padding. On the scale.
- KPI grid is `repeat(5, 1fr)` at wide, drops to 3, then 2, then 1
  at mobile. Breakpoints follow the `--bp-*` pattern if tokens
  exist, otherwise hard-coded (didn't verify every media query).
- Workload row uses a six-column grid: Person · Load · Used · WIP ·
  4wk · chev. Right-aligns numeric cells. Tight.
- Drill rows use a `minmax(0, 1fr) 140px 100px 40px 100px 40px`
  pattern (approx). Responsive collapses columns correctly at
  `<1200px` (`anlx-drill-row-owner, .anlx-row-actions { display:
  none }`). Good.

---

## 5. Ten-question review

1. **Purpose.** Yes — section titles and foot copy name the job.
2. **Hierarchy.** Yes — KPI values dominate, foot copy recedes.
3. **Clarity.** Fails in one place: sparklines and delta chips
   look like trend data, aren't (H1).
4. **Feedback.** Pass.
5. **Forgiveness.** Pass.
6. **Consistency.** Mostly pass — one concern is that
   `anlx-up-when.today` class applies to overdue rows too (L4).
7. **Accessibility.** Mostly pass. Missing focus-visible rings on
   drill/upcoming rows (L4).
8. **Speed.** Pass.
9. **Respect.** Breaks down where the page fakes data (H1).
   Respect = don't lie to the user.
10. **The belief.** Matches the *shape* ("decide something
    in 90 seconds") but not the *substance* (the sparklines and
    deltas feeding the decision are manufactured). Half-honored.

---

## 6. Ranked findings

### HIGH (1)

- **H1 — Sparklines, delta chips, and workload "hours" are
  fabricated data presented as analytics.**
  - `AnalyticsPage.tsx:1392-1403` — `seedHistory(seed, lo, hi)`
    is a deterministic linear-congruential generator. Every
    sparkline (KPI card + workload row) is 12 points of pseudo-
    random noise seeded by a string id. *There is no history
    being visualized.* The comment is honest about it:
    *"Deterministic pseudo-history for sparklines."*
  - `AnalyticsPage.tsx:567` — `deltaPct: onTimePct > 80 ? 3 :
    onTimePct > 60 ? -1 : -4`. The delta chip "+3% vs prior" on
    the On-time KPI is a hardcoded constant tied to the current
    value, not a real week-over-week comparison.
  - `AnalyticsPage.tsx:1357-1364` — workload allocates `4h` per
    open task per assignee. The "Used" column renders these as
    raw hours, e.g. *"28h used vs 40h budget → 70%"* — but there
    is no actual time tracking. The column header says "Used"
    with no qualifier. A user reading "Kyle: 28h used" will
    assume real hours logged.
  - Why it's HIGH: Analytics' job is to support decisions. Fake
    sparklines + fake deltas + fake hours, all presented as if
    real, poison every decision made from this page. The
    implementation *knows* it's fake (comments say so) but the
    UI does not signal it. A founder weighing "Kyle at 82% load,
    trend rising" against "Sarah at 75% load, trend flat" is
    acting on noise.
  - Fix options (pick one, or stage):
    (a) **Remove the fake layer.** Delete sparkline SVGs and
        delta chips from KPI cards; delete sparkline from
        workload row. Keep the foot copy ("3 already overdue")
        since that's computed honestly. Workload keeps `%` + WIP
        but drops "Used" hours column.
    (b) **Label it honestly.** Add "Demo" or "Placeholder" badge
        to the sparkline area; greyscale the chip; tooltip
        reading *"Historical comparison unavailable — connect a
        time-log source to enable."*
    (c) **Back with real data.** Requires new fields
        (`completedAt`, weekly snapshots, time logs) and is a
        much larger lift.
  - Prefer (a) for now — delete what can't be trusted, keep what
    can. Restore when real data exists.

### MEDIUM (5)

- **M1 — ~120 lines of dead Analytics CSS for four unshipped
  features.**
  - `flizow.css:12975-13094` covers:
    - `.anlx-save-view` (~12 lines) — saved-filter-combo button
    - `.anlx-saved-views`, `.anlx-sv-label`, `.anlx-sv-chip*`,
      `.anlx-sv-del` (~35 lines) — saved-views chip row
    - `.anlx-alerts`, `.anlx-alert-chip`, `.anlx-alert-dot`
      (~25 lines) — proactive alerts banner
    - `.anlx-row-actions`, `.anlx-row-act`, `.anlx-action-menu`
      (~25 lines) — inline row actions on hover
    - `.anlx-toast`, `.anlx-toast-msg`, `.anlx-toast-undo`
      (~23 lines) — bottom-center toast with undo
  - `rg anlx-save-view|anlx-saved-views|anlx-sv-|anlx-alert|anlx-toast|anlx-row-act|anlx-action-menu src --glob='*.tsx'`
    → **zero matches.** Four surfaces designed in CSS, never
    wired to React.
  - Fix: delete the dead blocks. Restore from git when any of
    those features actually ships. Net: ~120 fewer lines, one
    less "what's this for?" moment for the next person in the
    file.

- **M2 — "Today" bucket in Upcoming silently excludes overdue.**
  - `AnalyticsPage.tsx:1209-1215`:
    ```ts
    if (bucket === 'today') return diff >= 0 && diff <= 0; // just today
    if (bucket === 'week')  return diff >= 0 && diff <= 6;
    ```
  - Both buckets drop any task with `diff < 0`. So a task due
    three days ago is invisible under "Today" and "This week"
    tabs of Upcoming deliverables. But the KPI grid (*Due next 7
    days*) explicitly counts `overdue.length` as a separate
    sub-text. Two parts of the page disagree on whether overdues
    exist.
  - The Upcoming section is the place the operator plans *what
    to do next.* An overdue task is the #1 thing that needs to
    be done next — invisible is the worst state.
  - Fix: include `diff < 0` in the `today` bucket (overdues are
    implicitly "today's problem") and keep `week` as just
    future-only — or add a fourth tab, "Overdue", with its own
    count. Prefer the fold-into-today approach; it keeps the UI
    three-tab.

- **M3 — Date-window labels misrepresent the actual filter.**
  - `AnalyticsPage.tsx:197-207`:
    ```ts
    const days = filters.dateWindow === '7d' ? 7 : …;
    out = out.filter(t => {
      if (!t.dueDate) return true;
      const diff = daysBetween(todayISO, t.dueDate);
      return diff >= -14 && diff <= days;
    });
    ```
  - Filter pill label reads *"Next 7 days"*. Actual range is
    `[today - 14, today + 7]` — 14 days of overdue context
    silently included. Same for 30d and 90d.
  - The `-14` lookback is useful for surfacing recent slippage
    in the KPIs, but the label hides it. Two fixes, same idea:
    either relabel (*"Recent + next 7"* / *"Recent + 30 days"*)
    or split into two controls ("Overdue lookback" + "Look
    ahead").
  - Prefer relabeling for the first pass — keeps the pill count
    at three.

- **M4 — Tone colors duplicated as raw hex across TS and CSS
  instead of using tokens.**
  - `AnalyticsPage.tsx:1326-1333`:
    ```ts
    case 'over':  return '#ff453a';
    case 'tight': return '#ff9f0a';
    case 'ok':    return '#30d158';
    case 'soft':  return '#64d2ff';
    ```
  - `flizow.css` same hexes in at least:
    - `.anlx-kpi-delta.up` / `.good-down` (12668, 12671) → `#ff453a`
    - `.anlx-kpi-delta.down` / `.good-up` (12669, 12670) → `#30d158`
    - `.anlx-drill-row-status.late` (12749) → `#ff453a`
    - `.anlx-drill-row-status.soon` (12750) → `#ff9f0a`
    - `.anlx-up-when.today` (12824) → `#ff453a`
    - `.anlx-up-when.tomorrow` (12825) → `#ff9f0a`
    - `.anlx-wl-bar-fill.ok/soft/tight/over` (12941-12944)
    - `.anlx-wl-pct.over/tight` (12954-12955)
    - `.anlx-alert-chip.fire/warn .anlx-alert-dot` (13061-13062,
      dead per M1 anyway)
    - `.anlx-sv-del:hover` (13034) → `#ff453a`
  - `--status-fire` (`#ff453a` / `#ff3b30`), `--status-risk`
    (#ff9f0a territory), `--status-track` (`#30d158`) tokens
    exist (defined lines 6834+). Replace every `#ff453a`,
    `#ff9f0a`, `#30d158`, `#64d2ff` with the token, then change
    the token once if the palette ever drifts.
  - Same drift pattern flagged on Ops L1. Ops and Analytics
    together probably account for 30+ token violations.

- **M5 — Upcoming section silently truncates at 25 rows.**
  - `AnalyticsPage.tsx:1059` — `.slice(0, 25)` with no
    indicator. If the user switches to "This week" and there
    are 40 tasks due, they see 25 and assume that's the whole
    list.
  - Fix: either remove the slice (list is already scoped by
    bucket + filter, 40-60 rows isn't catastrophic) or add a
    footer *"Showing 25 of 40 — open the board for the full
    view."* Prefer removal; the list is already inside a
    scrollable container (`.anlx-up-list max-height: 360px`),
    so it already pages visually.

### LOW (5)

- **L1 — `inBucket('today')` tautology.**
  - `AnalyticsPage.tsx:1212` — `return diff >= 0 && diff <= 0;
    // just today`. This is `diff === 0` dressed as a range. The
    comment helps, but the expression is its own obstacle.
    Replace with `return diff === 0;` and keep the comment.

- **L2 — `isOpen` function name shadows an `isOpen` prop used
  elsewhere in the same file.**
  - `AnalyticsPage.tsx:1378` defines `function isOpen(t: Task)`.
  - `AnalyticsPage.tsx:466`, `:1276`, and other components in
    the file take an `isOpen: boolean` prop that means "panel
    open." Different scopes, no compile error, but a reader
    jumping around the file sees two meanings for the same
    token. Rename the predicate to `isOpenTask` or
    `taskIsOpen`.

- **L3 — Sparkline paths stretch via `preserveAspectRatio="none"`.**
  - `AnalyticsPage.tsx:485` and `:1306` both use
    `preserveAspectRatio="none"` on the sparkline SVG. Means
    the chart distorts to fit the container — a steep rise
    becomes a gentle slope when the container is wide. Even
    honest trend data would be misread at a glance.
  - Paired with H1, this compounds the trust issue. If the
    sparklines survive H1 removal (e.g. as real data with
    honest labeling), drop the `preserveAspectRatio="none"` and
    scale the viewBox to match the intended aspect.

- **L4 — Focus-visible rings missing on drill/upcoming rows.**
  - `flizow.css:12899-12903` — `.anlx-wl-row:focus-visible`
    gets a ring. `.anlx-drill-row` and `.anlx-up-row` don't,
    despite being keyboard-focusable `<a>` elements. A keyboard
    user tabbing through the Upcoming list sees no focus
    indicator. Add matching focus-visible rules.

- **L5 — Empty CSS rule `.anlx-wl-list { }`.**
  - `flizow.css:12881`. Purely cosmetic dead weight — the
    selector exists with no declarations. Delete.

---

## 7. Verify (positives worth preserving)

- **V1 — SessionStorage handoff with a lazy initializer.**
  `AnalyticsPage.tsx:64-71`:
  ```tsx
  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    const pendingService = sessionStorage.getItem('flizow-analytics-service');
    if (pendingService) {
      sessionStorage.removeItem('flizow-analytics-service');
      return { ...DEFAULT_FILTERS, serviceId: pendingService };
    }
    return DEFAULT_FILTERS;
  });
  ```
  Read + delete inside the state initializer so the one-shot
  happens exactly once, no useEffect needed, no race with render.
  This is the cleanest shape in the codebase — worth lifting into
  a shared `useSessionHandoff(key, default)` helper if the
  pattern grows.

- **V2 — Drill panels share shape, differ in data.** Both
  DrillDownPanel (KPI) and MemberDrillPanel (workload) use the
  same `.anlx-drill*` DOM shell, the same Esc-to-close handler,
  and the same row shape (`DrillTaskRow` / `DrillClientRow`).
  A user learns "drill into a number" once and the lesson
  transfers. Keep.

- **V3 — Row links honor web affordances.** `DrillTaskRow` and
  `UpcomingRow` use real `<a href>` elements with onClick
  preventDefault, and the onClick short-circuits on modifier
  keys (`e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0`).
  Result: left-click does the SPA nav + sessionStorage handoff;
  cmd-click opens the route in a new tab the browser's way. This
  is exactly how SPA links should behave and most codebases get
  it wrong. Keep.

---

## 8. Ship

**Nothing changes yet.** Queue, pending approval:

1. H1 — remove sparklines + delta chips + hours column (option
   a). Large visible win, ~80 LoC delete.
2. M1 — delete the ~120 lines of dead `.anlx-*` CSS.
3. M2 — fold overdues into the "Today" bucket.
4. M3 — relabel date windows or split the overdue lookback.
5. M4 — migrate hex colors to `--status-*` tokens across
   `toneColor()` + all `.anlx-*` rules. This is also the cross-
   page token rollout that Ops L1 touches.
6. M5 — drop the 25-row slice.
7. LOW — bundle.

Waiting on approval before touching code.

---

*Audit date: 2026-04-24. Auditor: Claude (session). Method: read
`AnalyticsPage.tsx` end-to-end + `.anlx-*` CSS, grep-verify every
selector against React consumers, apply the 8-step rubric.*
