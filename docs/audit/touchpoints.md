# TouchpointModal + TouchpointsTab — Paired Design Audit

**Files:**
- `src/components/TouchpointModal.tsx` (403 lines) — the log/schedule/edit modal
- `src/components/TouchpointsTab.tsx` (872 lines) — the meeting list + action items tab on ClientDetailPage

**Call sites:** TouchpointsTab is the only embedder (L9). The modal opens from two tab buttons (`handleLog` / `handleSchedule`) and from each meeting's overflow menu (`onEdit`).
**Shell:** `wip-modal-*` (shared with AddServiceModal, EditServiceModal, AddContactModal, AddQuickLinkModal, InsertLinkDialog)
**Audit date:** 2026-04-24
**Method:** 8-step Apple-design rubric (belief → 10 HIG → blue tiers → grids → checklist → rank → verify → ship)

---

## 1. Core belief restated

> **"The user came here to keep a paper trail of meetings so nothing falls through the cracks. Get out of their way and make sure what they log shows up exactly the same everywhere."**

Touchpoints is the meeting ledger. Every attendee chip, every TL;DR, every action item needs to look and read the same in the compose modal as in the list view — because the user is cross-checking one against the other while they type. The consistency-is-the-contract principle bites harder here than almost anywhere else in the app.

---

## 2. 10 HIG principles — applied

| # | Principle | Status | Evidence |
|---|-----------|:---:|---|
| 1 | Clarity beats cleverness | ✓ | Modal title flips between "Log meeting" / "Schedule meeting" / "Edit meeting" based on date + mode. Attendee sub-hint says "who was there" vs "who should be there" (TouchpointModal L286). Placeholder "Add TL;DR — why this meeting mattered" is a meaningful prompt, not "Enter summary." |
| 2 | Interface defers to content | ✓ | Modal chrome is muted. Meeting cards use two data-attribute states (`data-scheduled`, `data-done`) rather than chunky colored backgrounds. TL;DR editor is a transparent textarea that looks like the read-only version until you focus it. |
| 3 | Direct manipulation | ✓ | Attendee chips delete in place. TL;DR is click-to-edit. Action-item checkbox toggles directly. Promote flips to "On board ↗" directly. |
| 4 | Every action gets feedback | ⚠︎ | No toast on save in the modal. Single-service promote silently flips the button label — rapid-clickers won't notice anything happened. |
| 5 | Forgiveness is non-negotiable | ⚠︎ | Delete uses `ConfirmDangerDialog` with cascade count (great, TouchpointsTab L395-406). **But** Escape while the attendee picker is open closes the entire modal, losing all in-progress input. |
| 6 | Consistency is the contract | ✗ | **HIGH.** `avatarColor` is implemented differently in the two files. Same contact ID produces different colors in the modal's attendee picker vs the meeting list. `initialsOf` is also duplicated (identical body, but no reason for the duplication). |
| 7 | Hierarchy through typography | ✓ | Section title + subtitle + cadence pill + meeting entries all use the standard `detail-section-*` / `meeting-*` scale. No rogue font sizes. |
| 8 | Motion explains | ✓ | Modal transform-in works. No gratuitous motion elsewhere. Reduced-motion rules apply (flizow.css). |
| 9 | Accessibility is a layer | ⚠︎ | Overflow menu items use the `role="menuitem"` + `tabIndex` + `onKeyDown` pattern correctly. TL;DR click-to-edit has keyboard activation (TouchpointsTab L512-513). **But** the modal has no focus trap, topic error has no `role="alert"`, and the attendee picker's Escape race closes the whole modal. |
| 10 | Speed is a design decision | ✓ | No network. Derived data memoized per client.  |

---

## 3. Blue-tier hierarchy

- **Tier 1 (solid blue CTA):** "Schedule meeting" button in the tab header (TouchpointsTab L117) uses `meetings-log-btn--primary`; modal footer save button uses `wip-btn-primary`. Correct.
- **Tier 2 (ring secondary):** "Log touchpoint" button in the tab header (L110) is the non-primary variant of the same class. Renders as a ring-style secondary. Correct — secondary to the primary Schedule action.
- **Tier 3 (tint active):** Scheduled meetings show a `.meeting-scheduled-pill` with muted highlight tint. `data-scheduled="true"` drives the row accent. Correct.
- **Tier 4 (text-only inline):** "On board ↗" promote button (L643) is text-only at opacity 0.85. "Promote to card" is a ghost button. Cancel is ghost. Correct.

**Verdict:** Blue tiers are disciplined and correct. No violations.

---

## 4. Grids and layout

- Modal is 540px max-width. 2-column sub-grid for Kind + When (L258). Attendees field spans full width.
- Tab header: cadence left-aligned, action buttons right-aligned via flexbox.
- Meeting entry: icon + pill + date + topic + attendees + action link + overflow menu — all on one row with `margin-left: auto` pushing the overflow to the right edge.
- Action item row: checkbox + text + assignee + due chip + promote + delete — same horizontal layout, no vertical nesting.

**Finding:** the meeting top-row has 7 children on one line. On narrow viewports (or when the topic is long), this row will wrap awkwardly. No explicit wrap handling in the CSS.

---

## 5. Review checklist (10 questions)

1. **Purpose.** Tab subtitle + header pill both say "{N} touchpoint{s} this quarter" — clear in 5 seconds. ✓
2. **Hierarchy.** Section title dominant, cadence pill secondary, meeting list main content. ✓
3. **Clarity.** Placeholder copy is honest ("who was there" vs "who should be there"). ✓
4. **Feedback.** Promote-single-service is silent. Modal save is silent. ⚠︎
5. **Forgiveness.** Delete has cascade count. **But** Escape with picker open loses modal state. ⚠︎
6. **Consistency.** Same contact, different avatar colors across the two surfaces. ✗
7. **Accessibility.** Good on menu items + TL;DR click-to-edit. Bad on focus trap, aria-live, and Escape race. ⚠︎
8. **Speed.** Fast — local state, memoized derivations. ✓
9. **Respect.** Mostly yes. The color-mismatch and Escape race disrespect users who expect visual + state consistency. ⚠︎
10. **The belief.** Mostly yes — but the consistency break undermines the "same everywhere" promise this surface rests on.

---

## 6. Ranked findings

### HIGH (1)

**H1 — `avatarColor` helper is duplicated across both files with DIFFERENT implementations**

Same input (a contact or member id) produces different colors depending on which file computes it. A contact's avatar in the TouchpointModal attendee picker looks one color; their avatar in the meeting list right behind the modal looks another. Users eyeballing one against the other see a visual inconsistency that reads like a bug.

**Locations:**
- `src/components/TouchpointModal.tsx:398-403`:
  ```ts
  function avatarColor(seed: string): string {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsl(${hue} 70% 55%)`;  // ← 70% saturation
  }
  ```
- `src/components/TouchpointsTab.tsx:769-774`:
  ```ts
  function avatarColor(seed: string): string {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    const hue = Math.abs(h) % 360;
    return `hsl(${hue} 55% 55%)`;  // ← 55% saturation + different hash function
  }
  ```

The hash functions are different (`* 31 + ` with `>>> 0` vs `<< 5 - h +` with `| 0`), the normalization is different (no Math.abs vs Math.abs), AND the saturation is different (70% vs 55%). Three separate sources of divergence stacked on top of each other.

`initialsOf` is also duplicated (TouchpointModal L391-396, TouchpointsTab L759-764) — bodies happen to match character-for-character today, but there's no guarantee they stay that way.

**Fix sketch:** Extract both into `src/utils/avatar.ts`:
```ts
// Shared between every place that renders a contact/member avatar.
// Hash + saturation are locked here so every call site agrees.
export function initialsOf(name: string): string { /* ... */ }
export function avatarColor(seed: string): string { /* ... */ }
```

Delete the duplicates, import from both files. The TouchpointsTab implementation is probably the intended one (55% saturation reads more mature than 70%) — confirm with the user before picking which hash wins.

---

### MED (5)

**M1 — Escape race: picker open + Escape closes the entire modal**

The attendee picker's `useEffect` at TouchpointModal L107-116 only attaches a `pointerdown` listener for outside-click dismissal — it does NOT listen for Escape. The modal's global Escape handler at L88-103 catches Escape first and calls `onClose()`. Net effect: a user who opens the attendee picker, realizes it's showing stale results, and hits Escape to dismiss the dropdown ends up losing their entire meeting log — topic, kind, date, and all attendees they'd already added.

**Location:** `src/components/TouchpointModal.tsx:88-103` vs L107-116

**Fix:** add an Escape handler inside the picker effect that `setPickerOpen(false)` and calls `e.stopPropagation()` so the modal's handler doesn't fire:
```ts
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && pickerOpen) {
    e.stopPropagation();
    setPickerOpen(false);
  }
}
```

Mirrors the layered Escape dismissal already used by `TouchpointsTab`'s overflow menu (L225-227).

---

**M2 — `willBeScheduled` flips modal title + CTA mid-edit as the date drifts past `Date.now()`**

`willBeScheduled` is computed on every render (L213-215). If the user opens the modal at 10:58am to log a meeting with `occurredAt = 11:00am today` (future), the title reads "Schedule meeting" and the CTA reads "Schedule meeting". If the user then takes 3 minutes to finish the topic + attendees, by 11:01am the date is in the past — the title silently flips to "Log meeting" and the CTA to "Log meeting" while the user is still typing. They'll hit save thinking they're scheduling a future meeting and have actually logged a past one.

**Location:** `src/components/TouchpointModal.tsx:213-222`

**Fix options:**
- (a) Freeze `willBeScheduled` to its initial value on mount; only re-evaluate when the user explicitly edits the date field. Requires tracking whether the user touched the date vs. inherited the default.
- (b) Re-evaluate only when the date changes (not on every render) so the user's brief typing window doesn't cross a time boundary.
- (c) Render a small text explanation: "This is in the past — we'll log it" / "This is in the future — we'll schedule it" so the flip is at least visible.

Option (b) is probably cheapest and most honest.

---

**M3 — Duplicate text rendering: section subtitle AND cadence pill both show "{N} touchpoints this quarter"**

Two side-by-side renderings of the identical string:
- `TouchpointsTab.tsx:89-94` — inside `.detail-section-header` as the subtitle
- `TouchpointsTab.tsx:98-107` — inside `.meetings-header-left` as the cadence pill with a clock icon

Both fire from the same `quarterCount` + `openActions` derivations. On render, the user sees "3 touchpoints this quarter · 2 open action items" twice, in different-sized type, within ~40px of each other. This is either:
- An accidental duplicate left over from a refactor
- An intentional title/subtitle convention that happens to render the same string twice

If intentional, one should be a title ("Touchpoints" alone) and the other the cadence detail. Right now it reads like a bug.

**Fix:** delete the subtitle line (L91-94) OR change the subtitle copy to something different (e.g., a qualitative note like "Keep the paper trail fresh"). Confirm with the user which was intended.

---

**M4 — TL;DR empty placeholder double-rendered (data-attribute + visible span text)**

The empty-state span at `TouchpointsTab.tsx:519-527` renders the placeholder TWICE:
```tsx
<span
  className="meeting-tldr--empty"
  data-empty="true"
  data-placeholder="Add TL;DR — why this meeting mattered."
>
  Add TL;DR — why this meeting mattered.
</span>
```

The text is in BOTH the `data-placeholder` attribute AND the span's text content. If the CSS uses `::before { content: attr(data-placeholder); }` to render the placeholder, the user sees two copies of the string. If the CSS doesn't use the attribute, the `data-placeholder` is dead metadata.

**Fix:** pick one. Either (a) let the span render its own children and drop `data-placeholder`, or (b) style the span with `::before { content: attr(data-placeholder); }` and empty the children. Picking (a) is simpler and avoids the CSS generated-content gotcha.

---

**M5 — No focus trap on modal overlay; topic error has no `role="alert"`**

Same family issues as every other modal in the codebase:
- Tab from the last focusable element (Save button) lands on whatever is behind the overlay.
- `aria-invalid={topicError}` is set (L254) but no `aria-describedby` points at a visible error message, and there's no `role="alert"` region. Screen-reader users get silence when save "does nothing" because the topic is empty.

**Location:** `src/components/TouchpointModal.tsx:225-372` overall; L246-256 for the topic field.

**Fix:** same shared-hook approach as `AddContactModal` M3 / M4. One pass across the modal family.

---

### LOW (5)

**L1 — TL;DR lock tooltip references a feature that isn't visible**

`title="Locked after 72h · edit trail visible"` at TouchpointsTab L495 — "edit trail visible" implies a UI element the user can find. As of today there's no edit-trail surface. Either the feature is deferred (common pattern) or the tooltip is aspirational. Either way, the copy promises something the user can't reach.

**Fix:** Change to `title="Locked after 72h — this TL;DR is the final record"` until the edit trail ships. Swap back when it does.

---

**L2 — Single-service promote is silent**

When `clientServices.length === 1` and the user clicks "Promote to card", the action fires immediately and the button label flips from "Promote to card" → "On board ↗". No toast, no highlight animation. On a long list of action items, a rapid-clicking user can miss the label change and promote the same item twice (the store is idempotent via `promotedCardId` check, but the user doesn't know that).

**Location:** `src/components/TouchpointsTab.tsx:580-587`

**Fix:** brief 400ms highlight on the button background, or a "Promoted" 1.5s toast.

---

**L3 — Magic-number `setTimeout` for focus timing (again)**

- `TouchpointModal.tsx:80` — `setTimeout(..., 80)` for autofocus (same as every other modal in the family)
- `TouchpointsTab.tsx:445` — `setTimeout(..., 0)` for TL;DR textarea focus after switching to editing state

The `0` version is less offensive (it just defers to the next tick) but they're both patches around render-vs-focus timing that a `useLayoutEffect` or `requestAnimationFrame` would handle more explicitly.

---

**L4 — Attendee picker truncates at 30 with a "keep typing to narrow" hint, no scroll-through**

`TouchpointModal.tsx:348-352` shows "Keep typing to narrow X more" when candidates exceed 30. But the 30-item window is hard-capped; the user can't scroll past it. For a client with 40+ contacts (big enterprise clients on shared teams), the cut contacts are genuinely unreachable from this picker without typing something that filters them into the top 30.

**Fix:** raise the cap to 60 or remove it and rely on scrolling. Or add a dedicated "Show all" link at the bottom of the truncated list.

---

**L5 — `c.group === 'member' ? 'Team' : 'Client'` magic string comparison**

`TouchpointModal.tsx:343-345` — the ternary hardcodes the two labels. The `group` field is typed as `'member' | 'contact'`, so TypeScript gives no help if a future variant is added. A `Record<typeof group, string>` map would get compiler coverage.

---

### Verify (3 things that work well)

**V1 — One modal, three flows: log past + schedule future + edit, decided by `willBeScheduled`**

The header comment at TouchpointModal L5-25 explicitly explains the design:

> *"Scheduled flag auto-flips: if the user picks a date in the future, scheduled: true. Lets one modal cover both 'log past' and 'schedule future' without a mode toggle cluttering the UI."*

No "Log vs Schedule" segmented control to clutter the form. The date picker's value IS the mode signal. The title and CTA adapt to match. (M2 is about the timing edge case, not the design choice — the design choice is right.)

---

**V2 — Promote is a 3-way branch based on the number of services**

`TouchpointsTab.tsx:580-587`:
- 0 services → button disabled, tooltip says "Add a service to this client before promoting action items."
- 1 service → direct promote, no picker
- 2+ services → dropdown picker

This matches the user's actual decision space. A picker with one option would be rude (makes the user click twice for no reason); disabled with an explanation is better than silently failing.

---

**V3 — Delete-meeting confirm includes cascade count and explicitly spares promoted cards**

`TouchpointsTab.tsx:393-415`:
```tsx
const cascadeLine = actionCount > 0
  ? ` Drops the ${actionCount} action item${actionCount === 1 ? '' : 's'} attached to it.`
  : '';
// ...
body={`Removes this meeting and its TL;DR.${cascadeLine} Cards already promoted to the kanban board stay.`}
```

Tells the user exactly what will happen AND what won't. "Cards already promoted to the kanban board stay" is the belt-and-braces line that prevents the classic panic of "wait, I deleted the meeting, did I lose the downstream kanban work?" Forgiveness + honesty done right.

---

## 7. Scope notes (deferred — not in this audit)

The modal's header comment explicitly lists deferred fields:
- `durationMin`, `recordingUrl`/`Label`, `calendarUrl` — waiting on a future Otter/Fellow integration
- No edit-trail surface yet (see L1) — the TL;DR lock tooltip is forward-looking
- No bulk-import of historical meetings from a calendar feed

These are known omissions, not audit findings.

---

## 8. Filter question

> **"Does this respect the person using the app?"**

Mostly yes — the modal and the tab both work hard to be honest about what they do (cascade warnings, placeholder copy that explains the purpose, 3-way promote branch). The `avatarColor` divergence is the one place the app lies to the user by accident: same person, different color, no way to tell which is "right." Fix that first.

---

## Summary

- **1 HIGH:** `avatarColor` implemented differently in TouchpointModal (70% sat) vs TouchpointsTab (55% sat + different hash). Same contact renders different colors across paired surfaces. Fix: extract to `src/utils/avatar.ts`.
- **5 MED:** Escape race closes entire modal when picker is open; `willBeScheduled` flips mid-edit as time passes; duplicate cadence text rendered twice; TL;DR placeholder double-rendered (data-attribute + span text); no focus trap + silent topic error.
- **5 LOW:** TL;DR lock tooltip references invisible edit-trail; single-service promote silent; magic `setTimeout` focus timing; attendee picker hard-caps at 30 with unreachable remainder; magic-string group label comparison.
- **3 V's:** One modal for 3 flows via date-driven `willBeScheduled` auto-flip; promote 3-way branch (0/1/many services); delete-meeting cascade includes count + spares promoted cards.

Findings only — no fixes applied. Awaiting "go" to patch H1 (extract `avatarColor` + `initialsOf` to a shared util).
