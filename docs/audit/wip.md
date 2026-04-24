# Weekly WIP — Design Audit

**Surface:** `src/pages/WipPage.tsx` (1377 lines) · `src/styles/flizow.css` `.wip-*` rules (≈11146–12027)
**Run:** 2026-04-24
**Rubric:** 8-step Apple design (belief → 10 HIG → blue tiers → grids → checklist → findings → verify → ship)

---

## 1. Core belief

> The AM came here to prep and walk a standing meeting. Every second of friction is friction the whole room sees.

This is the page where one person drives the cadence for the team. Missing clicks, mislabelled pills, or a wrong time on a pre-read land in front of 8 people simultaneously. The page must earn trust twice: once during the quiet prep, and once while the meeting is live and the AM is on stage.

Every decision below filters through that.

---

## 2. 10 HIG through this page

1. **Clarity beats cleverness.** The "Saved just now" hint (toolbar, line 300) is hardcoded text with nothing behind it — no save event, no state. The `DUE THIS WK` / `DUE NEXT WK` abbreviations trade clarity for 10px of space. The `est. 15 min` label is a `Math.max(15, count * 2)` floor dressed as an estimate.
2. **Interface defers to content.** Header bar is ~110px (greeting + title + subtitle + meta card) — borderline heavy for a page whose content IS a list. Tolerable because the AM wants confidence they're on the right surface before editing the agenda.
3. **Direct manipulation.** Row click opens the right thing (client page, service board, edit modal) — good. Drag-to-reorder hooks are wired in CSS (`.is-dragging`, `.is-drop-target`, `.is-drop-target-bottom`) but not connected in TSX (comments at lines 510, 649 acknowledge the gap). The drag handle is visually promising a gesture that doesn't work.
4. **Feedback.** LiveMeeting timer ticks every second. Copy button animates → checkmark at 1.8s. Toolbar "Saved just now" is theatre. Remove button does its job but leaves no visible trace — no toast, no "1 item removed · Undo" ribbon.
5. **Forgiveness.** `setDismissed` only grows — no undo for an accidental remove. `deleteManualAgendaItem` is a hard delete with no grace period. Refresh brings auto items back (dismissed is session-local), which auto-heals half the problem, but manual items are lost.
6. **Consistency.** `wip-btn-primary` / `wip-btn-ring` / `wip-btn-ghost` maps cleanly to the 4-tier blue system. "Mark done" in LiveMeeting topbar is ring (Tier 2), not solid — right call because "Next" is the primary momentum button.
7. **Hierarchy via typography.** Group heads use a dot + title + count; items use a status pill + title + meta. Typography does the lifting; the only ornament is the colored group dot.
8. **Motion.** `transition: background var(--dur-fast)` everywhere; 1s interval tick is honest; `@media (prefers-reduced-motion)` override at 11867 kills the transitions. Well-behaved.
9. **Accessibility.** `role="button" tabIndex={0}` on `FlatRow` (line 461–462) and `CardRow` (line 497–498) with **no `onKeyDown`** — Enter and Space are ignored. Tab into a row, press Enter, nothing happens. `role="tablist"` / `role="tab"` on the nav without `role="tabpanel"` on the sections is a half-done ARIA pair. `FlatRow` only sets `aria-label` for manual items; new-client rows land on the client page with no voice announcement of their destination.
10. **Speed.** useMemo everywhere. One interval, not two. No lazy-loading concerns; data is in-memory.

---

## 3. Blue highlight hierarchy

| Tier | Where it lives | Verdict |
| --- | --- | --- |
| 1 · Solid (CTA) | `wip-btn-primary` — Start meeting, Save item, Copy to clipboard, Next | Correct. Only one per context. |
| 2 · Ring (secondary) | `wip-btn-ring` — Add agenda item, Send pre-read, Open in email, Mark done | Correct. |
| 3 · Tint (active state) | `.wip-tab.on`, `.wip-live-tl-item.is-current` (12% tint + left rail), `.wip-run-leave.is-on` | Correct. Tint matches the "you are here" semantic. |
| 4 · Text-only (inline) | — | Not used on this page. Nothing missing — no inline blue links to speak of. |

The one off-tier use is `wip-btn-ghost` (Cancel, End meeting, Prev) which sits outside the blue family — text-muted + border, neutral. Right pattern for a neutral destructive action.

---

## 4. Grid & layout

- Live meeting uses a sticky 280px timeline + fluid stage (`wip-live-grid`, line 11557). At <900px breakpoint it collapses to stacked. Good.
- Prestart stats tile is 3-up with `strong` + `span` stacked. Numbers are big, labels small. Hierarchy clear.
- Agenda list is linear — one group after another, no grid. Right call; scanning top-to-bottom matches how the meeting is run.
- `max-w-68ch` style constraints on agenda row titles (`wip-item-title: max-width: 62ch` in CSS) — but `.wip-item-title` is dead code. Active row titles don't have any max-width. Row widths are bounded by container, not by line-length.

---

## 5. Checklist

| Q | Answer |
| --- | --- |
| 1. Purpose in 5s? | Yes — "Prep the meeting" + auto-populated preview. |
| 2. Most important thing visually prominent? | Yes — agenda list dominates; Start meeting is primary-solid. |
| 3. Every control one meaning? | **No** — drag handles promise drag that isn't wired; "Saved just now" implies saves that aren't happening; `DUE THIS WK` abbreviation is ambiguous to screen readers. |
| 4. Action feedback <100ms? | Mostly yes; remove has no toast trail. |
| 5. Can undo? | **No** — remove from agenda is one-way; manual delete is permanent. |
| 6. Consistent patterns? | Mostly. `wip-btn-*` family is clean. `statusLabel` abbrevs are only used here. |
| 7. Keyboard / screen reader? | **No** — agenda rows ignore Enter/Space; no `role="tabpanel"`; new-client rows have no aria-label. |
| 8. Paints <1.5s? | Yes. |
| 9. Feels like it's working for the user? | Mostly. The hardcoded "Saved just now" and the dead drag handle undercut the sense that the app is honest. |
| 10. Matches the belief? | Partially — prep works; the meeting-facing Live tab is solid; but "Saved just now" + no undo + keyboard dead rows violate the "every second matters" claim. |

---

## 6. Findings (ranked)

### HIGH (1)

**H1. Keyboard activation is broken on every agenda row.**
`FlatRow` (lines 457–484) and `CardRow` (486–507) both set `role="button"` + `tabIndex={0}` + visible `cursor: pointer` but wire **no `onKeyDown` handler**. A keyboard user can Tab into any row in New clients / Top priority / On track / Added by hand, press Enter or Space, and nothing happens. Mouse users open the client page / service board / edit modal cleanly; keyboard users cannot. Every agenda interaction is blocked behind the pointer.

This repeats the Board-page H1 pattern. The correct fix is the OpsPage `DraggableCard` wiring (OpsPage.tsx 444–452) — copy the `onKeyDown` that handles `Enter` and `' '` and calls the click handler. Apply it to both row components and lift the keyboard logic into a shared helper.

While fixing, set `aria-label` on `FlatRow`'s new-client branch (currently only manual items get one, line 464) so screen readers announce the destination: `"Open client: {name}"` or `"Edit agenda item: {label}"` depending on `kind`.

---

### MED (5)

**M1. ≈530 lines of dead `.wip-*` CSS** across multiple abandoned feature attempts.
Verified by grepping every class name in `src/` — zero callers. Breakdown:

| Block | Lines | What it was for |
| --- | --- | --- |
| `.wip-queue-col` / `.wip-run-col` / `.wip-col-head/title/sub` / `.wip-queue*` / `.wip-queue-group*` | 11146–11197 (~50) | Old two-column "queue ↔ run" layout |
| `.wip-flag-card` / `.wip-flag-head/client/title/note/actions` / `.wip-flag-sev-dot` | 11199–11237, 12005–12012 (~55) | Severity-chip queue tiles |
| `.wip-icon-btn` | 11238–11252 (~15) | Supporting the above |
| `.wip-run*` (block, head, drag, index, title-col, title, meta-line, count-pill, leave, expand, body, actions) | 11270–11418 (~150) | Run-of-show rails |
| `.wip-live-flag` / `.wip-live-flag-sev/body/client/title/note/actions` | 11685–11715 (~31) | Live meeting severity flags |
| `.wip-live-agenda-card/content/title/meta/body/actions` | 11718–11747 (~30) | Pre-pass live agenda cards |
| `.wip-live-items` / `.wip-live-items-empty` | 11749–11766 (~18) | Item sub-list |
| `.wip-live-capture` + children (head, title, hint, btns, form, form-head, input, form-foot) | 11768–11811 (~44) | Live decision/action capture form |
| `.wip-live-log` + children (empty, entry, kind, text, meta, del) | 11813–11845 (~33) | Live meeting log panel |
| `.wip-live-footer-nav/left/hint` | 11847–11857 (~11) | Live meeting footer |
| `.wip-sev-row/opt/chip`, `.wip-field-severity` | 11973–11994 (~22) | Severity radio group |
| `.wip-stub*`, `.wip-kbd` | 11874–11911 (~38) | Stub view placeholder |
| `.wip-btn-muted`, `.wip-agenda-grid`, `.wip-agenda-flat-note`, `.wip-agenda-group--custom`, `.wip-next-meta*` | scattered (~25) | Minor orphans |

Also dead: the `.is-dragging` / `.is-drop-target` / `.is-drop-target-bottom` state rules on `.wip-agenda-card-row` and `.wip-agenda-flat-row` (11032–11042, 11115–11125). These anticipate the planned drag-to-reorder pass — they're harmless, but they visually promise a gesture that doesn't yet fire.

Scope: this is the largest dead-CSS payload in any audited page. Fix: move drag-state rules behind a feature flag (or delete until the drag pass lands), delete the queue/run/flag/live-capture/live-log/sev/stub blocks.

**M2. "Saved just now" hint is theatre.**
`AgendaToolbar` (line 300): `<span className="wip-save-hint">· Saved just now</span>`. It renders unconditionally whenever the agenda is non-empty. There is no save event — agenda auto-builds from the store every render, and manual items save through `flizowStore.updateManualAgendaItem`, which doesn't feed this hint. The copy claims a guarantee the page can't make.

Combined with **no undo** on remove (`setDismissed` only grows, no inverse) and **hard delete** on manual items, the cluster reads as: the page lies about saving, then silently destroys. Fix in one move: drop the "Saved just now" hint OR drive it from a real lastSavedAt ticker, and add an "Undo" chip (5–8s) next to the row removal feedback.

**M3. `est. N min` is a floor dressed as a forecast.**
Line 119: `const estMinutes = itemCount === 0 ? 0 : Math.max(15, itemCount * 2);`. One item or eight items, ≤7 items = 15 minutes. 15 items = 30 minutes. No customization, no historical data, no per-group weighting. A team whose Weekly WIP reliably runs 45 minutes will see "est. 15 min" and learn to distrust every other number on the page.

Fix: either (a) drop the label and call it "items" only, (b) let the AM set a per-agenda minute target, or (c) use previous-meeting elapsed to back the estimate. Don't leave a fake forecast sitting next to honest counts.

**M4. `urgentStatus` fallback mislabels critical-severity tasks as "BLOCKED".**
`urgentStatus` (lines 669–674):

```ts
function urgentStatus(t: Task, todayISO: string): AgendaStatus {
  if (t.columnId === 'blocked') return 'blocked';
  if (t.dueDate && daysBetween(todayISO, t.dueDate) < 0) return 'overdue';
  if (t.columnId === 'review') return 'review';
  return 'blocked';   // ← wrong
}
```

A task enters the urgent group from `buildAgenda` for three reasons: `columnId === 'blocked'`, `severity === 'critical'`, or overdue. When a `severity: 'critical'` task is not blocked, not overdue, and not in review, the function falls through to `'blocked'`. The pill reads BLOCKED on a card that's actually on-time-critical. The AM trusts the pill and walks into the meeting with the wrong framing.

Fix: widen `AgendaStatus` with `'critical'` and give it its own label + color, or change the fallback to `'overdue'` only when actually overdue and drop the pill otherwise.

**M5. Silent truncation on every auto group.**
`buildAgenda` (lines 566, 578, 592): `.slice(0, 6)` new-clients, `.slice(0, 12)` urgent, `.slice(0, 8)` on-track. No "and N more" indicator, no expander. If the week has 15 urgent cards, the meeting runs against 12 and the last 3 are invisible. Same pattern as Analytics Upcoming M5.

Fix: surface the hidden count ("12 of 15 — expand") or dynamically grow the cap until the AM hits a real limit (e.g., 40 total across all groups). Truncation that the AM can't see is truncation that breaks trust.

---

### LOW (5)

**L1. `data-view="wip"` attribute is a dead hook.**
`<div className="view view-wip active" data-view="wip">` (line 181). No selector in `src/styles/flizow.css` reads `[data-view="wip"]`. Same leftover from the `public/projectflow-test.html` static mock as every other page. Delete across the whole repo in one sweep.

**L2. Raw hex duplicates status tokens across `.wip-agenda-status[data-status=...]`.**
Lines 11069–11082 use `#d93025`, `#c92a1e`, `#b54708`, `#0a6edb`, `#5e5ce6`, `#8e4ec6`, `#22a559`, `#15833f` and the dark-mode branch uses `#ff6961`, `#ffb266`, `#5eadff`, `#a2a0ff`, `#7fdda0`. The `--status-fire` / `--status-risk` / `--status-track` / `--highlight` tokens exist and are used elsewhere on this page (`.wip-live-flag-sev.fire/risk/track`, `.wip-item.has-flag`). Consolidate.

**L3. `role="tablist"` / `role="tab"` without `role="tabpanel"`.**
Line 199: `<nav className="wip-tabs" role="tablist" ...>`. Line 342–349: tab links use `role="tab"` + `aria-current`. But `.wip-sub` sections (agenda, live) never carry `role="tabpanel"` or `aria-labelledby` pointing back at the tab. A screen reader announces "2 tabs" but never tells the user which tab's content they landed in. Fix by adding `id` to each tab, `role="tabpanel"` + `aria-labelledby` on each section.

**L4. `FlatRow` new-client rows have no `aria-label`.**
Line 464: `aria-label={item.kind === 'manual' ? 'Edit agenda item: ...' : undefined}`. New-client rows navigate to the client page but a screen reader only hears the button label ("Acme Corp") with no sense of destination. Set `aria-label={kind === 'client' ? 'Open client: ' + label : 'Edit agenda item: ' + label}`.

**L5. `nextMeetingLabel` one-liner has dead fallback.**
Line 710: `const daysToMon = dow === 1 ? 7 : (8 - dow) % 7 || 7;`. The `|| 7` fallback triggers when `(8 - dow) % 7 === 0`, which only happens at `dow === 1`. The outer `dow === 1 ? 7` already catches that case, so the `|| 7` is dead. Cosmetic — the value is correct — but the line takes longer to read than it should.

---

## 7. V's (3 — good patterns to preserve / copy)

**V1. LiveMeeting keyboard shortcuts are complete and scoped.**
Lines 1198–1209: `ArrowRight`/`j` → next, `ArrowLeft`/`k` → prev, `Space` → toggle done, `Escape` → end. The first check — `if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return` — prevents the shortcuts from eating keystrokes in a future notes field. Both Vim-style and arrow keys. This is how keyboard layers should ship on every interactive page. Backport to Board and Ops.

**V2. `PreReadModal` is honest about what it can't do.**
Line 1000–1002: "Copy this into Slack/email or open in your mail client. We don't send from here — the team's addresses live elsewhere." The button labels read "Open in email" and "Copy to clipboard" — not "Send." The software is told what it is (a text compiler + clipboard tool), not dressed as a mailer it isn't. This is exactly the design-language rule "never promise software can't deliver." Keep it as the template for every future "share" surface.

**V3. Modal keyboard accessibility is wired properly.**
`AddAgendaItemModal` handles `Escape` to close AND `⌘/Ctrl+Enter` to save from anywhere (lines 781–798), with an honest `// eslint-disable-next-line react-hooks/exhaustive-deps` paired with a why-comment explaining the deps list. `PreReadModal` handles `Escape` (lines 939–945). Auto-focus on title input with an 80ms delay to avoid eating the transition (lines 750–753). The magic-number delay is the one soft spot but the reason is stated.

---

## 8. Ship plan

Findings are ranked. Nothing in this file changes code. Proposed rollout when approved:

1. **H1** — copy OpsPage's `onKeyDown` pattern into `FlatRow` + `CardRow` and add aria-labels. One-file diff, hand-test with keyboard. Ship.
2. **M1** — delete dead `.wip-queue*` / `.wip-run*` / `.wip-flag*` / `.wip-live-flag*` / `.wip-live-agenda-card*` / `.wip-live-items*` / `.wip-live-capture*` / `.wip-live-log*` / `.wip-live-footer-*` / `.wip-sev-*` / `.wip-stub*` / `.wip-kbd` / `.wip-btn-muted` / orphan blocks. Keep `.is-dragging` / `.is-drop-target` state rules IF M6 drag pass is imminent; otherwise delete. One CSS-only diff. Ship.
3. **M2** — drop "Saved just now" (or drive from a real last-save event) + add Undo chip for remove/delete. Tight, user-visible. Ship.
4. **M4** — widen `AgendaStatus` with `'critical'` + status pill. Small type + color + label change. Ship.
5. **M3** — decide: cut `est. N min`, or build the minute input, or drive from history. Needs product call.
6. **M5** — surface hidden count on each group. Small render change.
7. **L1–L5** — sweep-in with the next CSS pass.

Nothing to backport from here unless V1 (keyboard shortcuts) gets carried into Board + Ops during their fix passes.

---

## Filter question

> **"Does this respect the person using the app?"**

Mostly yes — but the AM stands in front of the room with a "Saved just now" that isn't, an estimate that is a floor, a BLOCKED pill on a critical-not-blocked card, and no keyboard path to open any row. The Live tab respects the facilitator. The Agenda tab needs a second pass to earn the same trust.
