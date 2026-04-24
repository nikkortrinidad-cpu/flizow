# Cross-Cutting Patterns — 12 Audits

**Inputs:** `overview.md`, `clients.md`, `client-detail.md`, `board.md`, `ops.md`, `analytics.md`, `wip.md`, `templates.md`, `card-modal.md`, `edit-service-modal.md`, `add-contact-modal.md`, `touchpoints.md`.
**Purpose:** identify findings that hit 3+ surfaces so Wave 1 batches the extractions before Waves 2–4 touch the individual audits.

---

## 1. The keyboard-dead interactive role

**Pattern:** `role="button"` + `tabIndex={0}` + visible `cursor: pointer`, **no `onKeyDown` handler**. Tab lands focus on the element; Enter and Space do nothing.

**Call sites:**
- `WipPage.tsx:457–484` — `FlatRow` (WIP H1)
- `WipPage.tsx:486–507` — `CardRow` (WIP H1)
- `FlizowCardModal.tsx:544–550` — Status (Card Modal H1)
- `FlizowCardModal.tsx:578–584` — Priority (Card Modal H1)
- `FlizowCardModal.tsx:804–811` — Description (Card Modal H1)

**Related DnD gap** (keyboard sensor absent from board-style drag surfaces):
- `BoardPage.tsx:446–451` — only `useSensor(PointerSensor)` (Board H1)
- `OpsPage.tsx:56–58` — same gap (Ops H1)

**Working pattern to copy:**
- `OpsPage.tsx:444–452` — DraggableCard wires Enter + Space + role/tabIndex correctly (Ops V1)
- `WipPage.tsx:1198–1209` — LiveMeeting keyboard layer (WIP V1)

**Extraction:** `useActivatableRow(onActivate)` hook that returns `{ role, tabIndex, onKeyDown }` as spreadable props. Plus register `KeyboardSensor` + `sortableKeyboardCoordinates` on the two DnD contexts.

**HIGHs this closes (all 4):** WIP H1, Card Modal H1, Board H1, Ops H1.

---

## 2. The modal boilerplate quintet

**Pattern:** every modal hand-rolls the same four pieces: focus trap, autofocus with `setTimeout(…, 80)`, Escape to close, Cmd/Ctrl+Enter to save. They drift.

**Call sites (autofocus + Escape):**
- `WipPage.tsx:750–753, 781–798` — `AddAgendaItemModal` (WIP V3, stated magic-number soft-spot)
- `WipPage.tsx:939–945` — `PreReadModal` (Esc only)
- `FlizowCardModal.tsx` — Esc + autofocus
- `AddContactModal` (inline in `ClientDetailPage.tsx:2395–2590`)
- `EditServiceModal.tsx:68–69` — autofocus **and** selects name
- `AddServiceModal` (inline `ClientDetailPage.tsx:2201–2391`) — autofocus only
- `TouchpointModal.tsx` — Esc + autofocus

**Drift visible:** AddServiceModal focuses; EditServiceModal focuses + selects — same field, different UX (Edit Service Modal HIGH).

**Extractions:**
- `useModalAutofocus(ref, { select?: boolean, delayMs?: number })` — folds the 80ms setTimeout into one named pattern.
- `useModalKeyboard({ onClose, onSave? })` — Escape always; Cmd/Ctrl+Enter when `onSave` provided.
- `useModalFocusTrap(ref)` — traps Tab inside the modal, restores focus on close.

---

## 3. The outside-click + Escape popover dismiss

**Pattern:** useEffect with `mousedown` listener + `keydown` for Escape, re-written per dropdown.

**Call sites:**
- `BoardPage.tsx` — **three** copy-paste `useEffect`s per Board M3 (crumb menu, board settings, service switcher)
- `ClientDetailPage.tsx` — hero kebab + per-service-card kebabs
- `AnalyticsPage.tsx` — drill panels
- Various modal close-on-backdrop handlers

**Extraction:** `useDismissable(ref, open, onClose)` — one hook covering outside-click and Escape, no arg juggling at call sites.

---

## 4. Avatar initials + color — duplicated AND diverged

**Pattern:** `initialsOf` + `avatarColor` pair, copied between two files with different algorithms producing different colors for the same seed.

**Call sites:**
- `TouchpointModal.tsx:391–403` — `h = (h * 31 + seed.charCodeAt(i)) >>> 0` → `hsl({hue} 70% 55%)`
- `TouchpointsTab.tsx:759–774` — `h = ((h << 5) - h + seed.charCodeAt(i)) | 0` → `hsl(... 55% 55%)`

Same user's avatar renders different colors in the modal vs. the tab list. User-visible drift.

**Extraction:** `src/utils/avatar.ts` exporting `initialsOf(name)` + `avatarColor(seed)`. Pick one algorithm (recommend the tab's `<<5 - h` — that's the canonical djb2 variant).

**HIGHs this closes:** Touchpoints HIGH.

---

## 5. Service metadata form — duplicated AND drifted

**Pattern:** ~180 lines of form (name, category, phase editor, brief, due date, primary-contact picker) copy-pasted between Add and Edit service modals.

**Call sites:**
- `ClientDetailPage.tsx:2201–2391` — `AddServiceModal` (inline)
- `EditServiceModal.tsx:34–277` — standalone file

**Drift visible:** autofocus behavior differs (see §2); field order subtly differs on category→phase transition; validation error strings differ.

**Extraction:** `<ServiceMetadataForm mode="add"|"edit" initial={…} onSubmit={…} />`. Add and Edit modals become thin shells that supply defaults + submit handler.

**HIGHs this closes:** Edit Service Modal HIGH.

---

## 6. Inline card composer — duplicated

**Pattern:** "+ Add Card" inline composer — textarea, Enter to submit, Escape to cancel, autofocus on open — built twice.

**Call sites:**
- `BoardPage.tsx` — `AddCardInline`
- `OpsPage.tsx` — `AddOpsCardInline` (Ops M4, ~55 lines duplicated)

**Extraction:** `<InlineCardComposer onSubmit={…} onCancel={…} placeholder={…} />`.

---

## 7. Searchable picker (Assignee / Label)

**Pattern:** scroll-bounded popover with a search input on top and a filterable list below.

**Call sites:**
- `FlizowCardModal.tsx` — `AssigneePicker`
- `FlizowCardModal.tsx` — `LabelPicker`

**Extraction:** `<SearchablePicker items={…} renderItem={…} onSelect={…} searchableOn={…} />`. Not a 3+-file hit today but both sit in the same component and will mint a third copy the moment a third pickable entity shows up.

---

## 8. Dead `data-view="{page}"` attribute — 7+ pages

**Pattern:** root page `<div>` carries `data-view="wip"`/`"templates"`/`"board"` etc. **No selector in `src/` reads it.** Dead hook left over from `public/projectflow-test.html` static mockup.

**Confirmed dead sites:** Overview, Clients, Board, Ops, Analytics, WIP (`L1`), Templates (`L1`). Likely also Client Detail.

**NOT dead and often conflated:** `body[data-active-view="{name}"]` — this one IS used by CSS to pin per-page `display` rules. Different attribute, different element.

**Extraction:** none needed. Single cross-file delete in Wave 4 (LOW sweep).

---

## 9. Dead CSS ledger (~1,260+ lines across 6 pages)

**Pattern:** CSS for features that never shipped or that moved to TSX-inline. Verified dead by grepping class names in `src/` → only CSS matches.

| Page | Lines | Blocks |
| --- | --- | --- |
| WIP | ~530 | `.wip-queue*`, `.wip-run*`, `.wip-flag*`, `.wip-live-flag*`, `.wip-live-agenda-card*`, `.wip-live-items*`, `.wip-live-capture*`, `.wip-live-log*`, `.wip-live-footer-*`, `.wip-sev-*`, `.wip-stub*`, `.wip-kbd`, orphans |
| Board | ~200 | legacy board rules (Board M2) |
| Templates | ~175 | `.as-*` Add Service modal mockup + `.template-activity-*` |
| Overview | ~125 | `.block-drag*` (~70) + `.wipnext-*` (~55) |
| Analytics | ~120 | `.anlx-*` for four unshipped features |
| Client Detail | ~110 | `.hero-kebab`, `.hero-btn`, `.hero-logo` overlay, `.detail-breadcrumb` |

**Extraction:** none. One CSS-only diff at the end of Wave 4.

---

## 10. Raw hex color duplication vs. tokens

**Pattern:** CSS blocks and inline styles hardcode hex values that already have tokens in `:root`.

**Call sites:**
- `flizow.css:11069–11082` — `.wip-agenda-status[data-status=…]` uses `#d93025, #c92a1e, #b54708, #0a6edb, #5e5ce6, #8e4ec6, #22a559, #15833f` while `--status-fire / --status-risk / --status-track / --highlight` exist (WIP L2).
- AnalyticsPage — tone colors duplicated as raw hex across TS and CSS (Analytics M4).
- Client Detail — 40+ inline `style={{…}}` blocks (Client Detail M4) carry raw values.

**Extraction:** none; cross-file consolidation pass during Wave 4. Could be a `src/styles/tokens.ts` mirror for TS consumers if that collapses Client Detail's inline clusters.

---

## 11. Theatre / fake state copy

**Pattern:** UI claims a state the code doesn't back.

**Call sites:**
- `WipPage.tsx:300` — "Saved just now" hardcoded (WIP M2).
- `TemplatesPage.tsx:292–295` — "Add template" button with no `onClick` (Templates H1).
- `TemplatesPage.tsx:368` — "Last edited —" placeholder (Templates M4).
- `TemplatesPage.tsx:454–472` — Activity section that will never populate (Templates M3).
- `ClientDetailPage.tsx:1006–1114` — `ActivitySection` relabels `task.createdAt` with current-column verb, producing "Sam moved to review" timestamped 6 months ago (Client Detail H1).
- `AnalyticsPage.tsx:567, 1357–1364, 1392–1403` — hardcoded delta, 4h-per-task workload, LCG PRNG for sparklines (Analytics H1).

**Extraction:** none — this is design discipline, not a shared util. Each fix is a delete or a wire-up, not a refactor.

---

## 12. Silent truncation on `.slice(0, N)`

**Pattern:** auto-built list slices to a hardcoded cap with no "and N more" indicator.

**Call sites:**
- `WipPage.tsx:566, 578, 592` — `buildAgenda` slices new-clients/6, urgent/12, on-track/8 (WIP M5).
- Analytics Upcoming M5 (same pattern).

**Extraction:** none — a UI pattern decision. Either `<TruncatedListFooter count={hidden} onExpand={…} />` or surface the full count in the group header.

---

## Wave 1 shared-util list (proposed)

| # | Utility | Files touched | Closes |
| --- | --- | --- | --- |
| 1 | `useActivatableRow(onActivate)` hook | Card Modal (3), WIP (2 rows) | Card Modal H1 · WIP H1 |
| 2 | `registerKeyboardSensor` on DnD contexts | BoardPage, OpsPage | Board H1 · Ops H1 |
| 3 | `useModalAutofocus(ref, opts)` | 6+ modals | Cleans WIP V3 magic number; consistency |
| 4 | `useModalKeyboard({ onClose, onSave })` | 6+ modals | Consistency |
| 5 | `useModalFocusTrap(ref)` | 6+ modals | Accessibility baseline |
| 6 | `useDismissable(ref, open, onClose)` | Board (×3), Client Detail, Analytics | Board M3 |
| 7 | `src/utils/avatar.ts` (`initialsOf` + `avatarColor`) | TouchpointModal, TouchpointsTab | **Touchpoints HIGH** |
| 8 | `<ServiceMetadataForm>` | AddServiceModal, EditServiceModal | **Edit Service Modal HIGH** |
| 9 | `<SearchablePicker>` | FlizowCardModal (Assignee, Label) | Consistency |
| 10 | `<InlineCardComposer>` | BoardPage, OpsPage | Ops M4 |
| 11 | `<InlineRename>` | BoardPage breadcrumb + hero rename | Board V2 consistency |

**HIGHs auto-closed by Wave 1:** Touchpoints HIGH (§4), Edit Service Modal HIGH (§5), Card Modal H1 (§1), WIP H1 (§1), Board H1 (§1), Ops H1 (§1) — **6 of 12**.

**HIGHs remaining for Wave 2:**
- Overview H1 — health-cell nav doesn't match aria-label (`OverviewPage.tsx:159, 168, 181`).
- Client Detail H1 — `ActivitySection` relabels `createdAt` with current-column verb.
- Analytics H1 — fabricated data across sparklines, deltas, workload hours.
- Add Contact H1 — silent primary-contact demotion (`flizowStore.ts:1344–1358, 1361–1369`) + UI at `ClientDetailPage.tsx:2553–2576`.
- Templates H1 — "Add template" stub button (3-line decision: hide / disable+tooltip / wire).
- WIP M4 — `urgentStatus` fallback mislabels critical tasks as BLOCKED (treated as HIGH-adjacent).

---

## Approval checkpoint

Wave 1 creates 11 shared pieces across `src/hooks/`, `src/utils/`, and `src/components/shared/`. Net diff: new files + per-call-site replacements; ~800 lines added, ~1,400 lines deleted once Wave 2/3/4 pick up the remaining call sites.

Say `go` to start Wave 1 with this list, or name which utilities to cut or add before I begin.
