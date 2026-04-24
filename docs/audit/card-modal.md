# FlizowCardModal — Design Audit

**File:** `src/components/FlizowCardModal.tsx` (1,774 lines)
**Call sites:** BoardPage, OpsPage, Analytics drill-in, Weekly WIP (4 surfaces)
**Audit date:** 2026-04-24
**Method:** 8-step Apple-design rubric (belief → 10 HIG → blue tiers → grids → checklist → rank → verify → ship)

---

## 1. Core belief restated

> **"The user came here to finish a task on this card. Get out of their way and help them finish."**

This modal is where editing actually happens — status, description, checklist, assignees, labels, comments. It's the most-trafficked surface in Flizow, so friction here multiplies across every page that opens it. A keyboard user who can't reach the Priority picker on a Board card hits the same wall on the Ops board, on the Analytics drill-in, and on the Weekly WIP agenda.

---

## 2. 10 HIG principles — applied

| # | Principle | Status | Evidence |
|---|-----------|:---:|---|
| 1 | Clarity beats cleverness | ⚠︎ | Status/Priority pickers read as plain text with a dot — no chevron, no hover affordance that screams "I open a menu." Click-to-edit Description is a `<div>` that only reveals itself through cursor-change on hover. |
| 2 | Interface defers to content | ✓ | Titlebar is slim. Sidebar is muted. Content (title, description, checklist) gets the prominent type and space. |
| 3 | Direct manipulation | ✓ | Title edits in place. Description opens inline (no modal-in-modal). Checklist items rename inline. Status/Priority edit inline via dropdowns. |
| 4 | Every action gets feedback | ⚠︎ | Copy-link shows "Link copied" for 1.6s — good. But Save on description is silent (no toast). Checklist toggle is instant and silent. No optimistic-UI hints for server round-trips (all local today). |
| 5 | Forgiveness is non-negotiable | ⚠︎ | Delete uses in-app ConfirmDangerDialog (good), comment-delete warns about cascading replies (great), **but** checklist item delete is a hard immediate remove with no undo. Label/assignee toggles are instant with no undo. |
| 6 | Consistency is the contract | ⚠︎ | AssigneePicker (L1077-1171) and LabelPicker (L1175-1246) are ~95% duplicate code. Inline styles are scattered across 12+ locations. Dropdown positioning uses `position: relative` on one parent, `position: absolute` on another. |
| 7 | Hierarchy through typography | ✓ | Title is large. Section labels are consistent. Meta-rows use a tight label/value pair. |
| 8 | Motion explains | ✓ | No gratuitous animation. Dropdowns appear/disappear without flourish. |
| 9 | Accessibility is a layer | ✗ | **HIGH.** Three `role="button"` divs (Status, Priority, Description) are focusable via Tab but can't be activated via Enter/Space because `onKeyDown` is missing. Menu items correctly implement the pattern; the meta/description divs skipped it. |
| 10 | Speed is a design decision | ✓ | No heavy network calls. Modal opens from local state. PickerMenu uses setTimeout(0) to defer outside-click listener registration so the opening click doesn't immediately close the menu. |

---

## 3. Blue-tier hierarchy

4-tier audit (solid CTA · ring secondary · tint active · text-only inline):

- **Tier 1 (solid blue CTA):** Save button for description edit (L796-800) — correct usage, saves the draft.
- **Tier 2 (ring secondary):** None visible. The "New checklist item" add button uses a muted background, not a ring.
- **Tier 3 (tint active):** Selected state on label/assignee options uses `is-selected` class — tint-style treatment, correct.
- **Tier 4 (text-only inline):** Cancel button for description edit (L791-795) — plain text on transparent, correct.

**Verdict:** Blue tiers are used sparingly and correctly inside the modal. No violations.

---

## 4. Grids and layout

- Meta-table is a 2-column grid (label | value) — consistent across Status, Priority, Assignees, Labels, Start date, Due date.
- Description, Checklist, and Meta-table align to the same left gutter.
- Sidebar uses fixed 420px width (matches `CardDetailPanel` legacy sidebar for muscle memory).
- Line length on description and comments looks unbounded — on a wide viewport, comment text can stretch past 100 characters per line, breaking the 45-70cpl rule.

**Finding:** M6 — no max-width on comment body text. Long paragraphs become hard to track.

---

## 5. Review checklist (10 questions)

1. **Purpose.** A new user opening the modal sees the title + status + description immediately. ✓
2. **Hierarchy.** Title is largest, description second, meta and checklist below. ✓
3. **Clarity.** Status/Priority pickers don't signal they're clickable until hover. ⚠︎
4. **Feedback.** Save-description is silent. Checklist toggle is silent. ⚠︎
5. **Forgiveness.** Checklist delete is hard. No undo for label/assignee toggles (though they're cheap to reverse). ⚠︎
6. **Consistency.** AssigneePicker ≠ LabelPicker in code, even though they should be. Inline styles fragment the style system. ⚠︎
7. **Accessibility.** Three `role="button"` divs fail keyboard activation. Focus trap is missing on the modal overlay. ✗
8. **Speed.** Fast — all state is local. ✓
9. **Respect.** Mostly yes. The comment-delete cascade warning is exemplary. The keyboard bug disrespects Tab users. ⚠︎
10. **The belief.** Mostly yes — the modal gets the user to edit quickly, except where keyboard access is broken.

---

## 6. Ranked findings

### HIGH (1)

**H1 — Keyboard activation broken on Status, Priority, and Description pickers**

Three divs use `role="button"` + `tabIndex={0}` + `onClick` without `onKeyDown`. Screen-reader and keyboard-only users can Tab to them but cannot activate them with Enter or Space. This is the same pattern the More-menu items (L388, 424, 458, 478) correctly implement — the meta rows just didn't get the handler.

**Locations:**
- `src/components/FlizowCardModal.tsx:544-550` — Status picker
  ```tsx
  <div
    className="meta-value meta-edit"
    tabIndex={0}
    role="button"
    aria-label="Change status"
    onClick={() => { setStatusOpen(v => !v); setPriorityOpen(false); }}
  >
  ```
- `src/components/FlizowCardModal.tsx:578-584` — Priority picker (same pattern)
- `src/components/FlizowCardModal.tsx:804-811` — Description click-to-edit box

**Fix sketch:** Add the standard handler already used four times in this file:
```tsx
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    (e.currentTarget as HTMLElement).click();
  }
}}
```

Or flip `<div>` → `<button type="button">` with matching styling — preferable because it's semantic and avoids the polyfill. ConfirmDangerDialog cascade-copy + archived-card flow both depend on this modal staying accessible.

---

### MED (6)

**M1 — `AssigneePicker` and `LabelPicker` are ~95% duplicate code (≈180 lines of copy-paste)**

- `src/components/FlizowCardModal.tsx:1077-1171` — AssigneePicker (95 lines)
- `src/components/FlizowCardModal.tsx:1175-1246` — LabelPicker (72 lines)

Both components:
- Take `selectedIds`, `query`, `onQueryChange`, `onToggle`, `onClose`
- Own the same outside-click + Escape handler pattern with a setTimeout(0) guard
- Render a search input + scrollable list + is-selected checkmark
- Only differ in: (a) the data source (MEMBERS vs BOARD_LABELS), (b) the chip shape (avatar+name vs label-pill)

A single `<SearchablePicker items renderItem onQueryChange ...>` would cut ~180 lines and guarantee the two stay in sync. Current risk: a future fix to AssigneePicker's outside-click timing will silently not propagate to LabelPicker.

---

**M2 — Inline-style clusters fragment the design system**

Twelve locations mix inline `style={{...}}` with className-driven styling. The heaviest offenders:

- `src/components/FlizowCardModal.tsx:776-788` — Description textarea has **10 inline style props** (padding, border, fontSize, fontFamily, lineHeight, resize, outline, background, color, minHeight) that should all live in `.description-textarea` CSS.
- `src/components/FlizowCardModal.tsx:791-800` — Cancel/Save buttons for description have 7-prop inline styles each, duplicating button styling that exists elsewhere in the codebase.
- `src/components/FlizowCardModal.tsx:1047-1054` — ChecklistRow delete button has 9 inline style props instead of a `.checklist-delete-btn` class.
- `src/components/FlizowCardModal.tsx:1233` — LabelPicker option button has 7 inline style props.

Impact: theme tokens can't be swapped uniformly; dark-mode overrides have to chase each inline block; new contributors can't grep for a class name to find the style.

---

**M3 — Missing focus trap on modal overlay**

The modal overlay (L303-ish, the outermost div) does not trap focus. Tab from the last focusable element inside the modal lands on whatever is behind it in the DOM (Board header, column buttons, etc.). A screen-reader user thinks they've left the modal when they haven't — or worse, they interact with a control on the underlying board while the modal is still open.

Standard fix: a focus-trap utility (either a small custom hook with `focusin`/`focusout` listeners, or `focus-trap-react`).

---

**M4 — `aria-labelledby` points at a mutable input value**

The title input uses its own value as the accessible name. When the user types, the aria-label changes on every keystroke. Screen readers announce the label change repeatedly. Fix: give the input a stable `aria-label="Card title"` and let the visible value be the content itself.

(Found in the title-input block around L520-535.)

---

**M5 — Deep-link URL hack: forcing hash re-parse by setting to `#` first**

`src/components/FlizowCardModal.tsx:379-385`:
```tsx
const target = `#board/${task.serviceId}`;
if (window.location.hash === target) {
  window.location.hash = '';
  window.location.hash = target;
} else {
  window.location.hash = target;
}
```

This hack exists because BoardPage's mount-time auto-open effect only fires on hash change. Setting the hash to `''` and then back is a workaround for a missing router event. Works today but brittle: if React strict mode or a router upgrade changes when the effect fires, this breaks silently. Comment acknowledges the hack honestly (✓), but the underlying contract should move into a shared router helper.

---

**M6 — Comment body text has no max line length**

Long comments on wide viewports stretch past 100 characters per line, violating the 45-70cpl rule. Sidebar is 420px which is fine, but on the activity-tab panel the line can run the full content width.

Fix: `max-width: 65ch` on `.comment-body` and `.activity-row-text`.

---

### LOW (5)

**L1 — `reply-btn` class is used for both "Reply" and "Delete" actions**

The same CSS class drives two semantically different buttons in the comments panel. Renaming to `comment-action-btn` (or splitting into `reply-btn` + `delete-btn`) would make the CSS grep-ably accurate.

---

**L2 — Orphan label pills have no remove affordance inside the modal**

Labels attached to a card appear as pills in the meta-value cell. Clicking the pill doesn't remove it — removal requires opening LabelPicker, unchecking, closing. Most kanban tools let you click a pill X to remove. Small friction, compounds over many labels.

---

**L3 — Checklist progress percentage jumps without animation**

The `.progress-fill` div changes width instantly. A 150ms ease-out transition on `width` would make toggling items feel responsive without being distracting. Respects `prefers-reduced-motion` if implemented with a CSS variable.

---

**L4 — `PickerMenu` (L969-989) registers its outside-click handler with `setTimeout(0)`**

This is an anti-pattern for a reason: it works around a double-fire when the opening click bubbles up and the outside-click handler catches it on the same event loop tick. The same pattern repeats in AssigneePicker (L1109) and LabelPicker (L1195). A dedicated "menu controller" hook would centralize this logic instead of copy-pasting the timeout.

---

**L5 — Share modal and confirm dialog portals are conditional children, not portals**

`FlizowShareModal` and `ConfirmDangerDialog` render as direct children of the modal root. On very long cards with lots of checklist items + comments, they inherit the modal's scroll position. A true `createPortal` to `document.body` would eliminate any z-index or scroll-containment surprises.

---

### Verify (3 things that work well)

**V1 — The kind-adapter pattern (L98-137)**

Every mutation routes through a single adapter that knows whether the card is a Board task or an Ops task. One place to change if the data model adds a new kind. Comment documents the intent clearly: *"Single indirection so the modal body doesn't care which store it's writing to."*

---

**V2 — `TaskMissingAutoClose` graceful handling (L1065-1071)**

If the card being displayed is deleted out from under the modal (e.g., by another tab via Firestore sync), the modal closes itself instead of throwing. Small, quiet, correct.

---

**V3 — Cascade-warning copy on comment delete (in CommentsPanel, L1265-1420 range)**

When a user deletes a comment that has replies, the confirm dialog says the replies will be deleted too. This is the forgiveness-principle done right: no silent data loss, no surprise, user's choice is informed.

---

## 7. Scope notes (deferred items — not in this audit)

The top-of-file comment (L1-84) documents these honestly — they remain deferred:
- Per-card permission gating (read-only mode) — currently all users see all controls.
- Attachments section — not rendered at all; attachment count on the card preview points nowhere from inside this modal.
- Rich-text description — the current textarea is plain. MarkdownEditor (used in legacy CardDetailPanel) isn't wired here.

None of these block shipping today's audit findings; they're already tracked.

---

## 8. Filter question

> **"Does this respect the person using the app?"**

Mostly yes — but the keyboard-activation bug on Status / Priority / Description is a clear no for anyone who Tabs instead of clicks. That's the first fix. Everything else is polish.

---

## Summary

- **1 HIGH:** 3× `role="button"` divs missing `onKeyDown` (Status L544, Priority L578, Description L804).
- **6 MED:** Picker duplication (~180 lines), inline-style clusters (12+ locations), missing focus trap, mutable aria-labelledby, hash re-parse hack, no max-width on comment body.
- **5 LOW:** Dual-purpose class name, orphan label pills, progress-bar jump, setTimeout(0) copy-paste, non-portal overlays.
- **3 V's:** Kind adapter, TaskMissingAutoClose, cascade-warning copy.

Findings only — no fixes applied. Awaiting "go" to patch H1.
