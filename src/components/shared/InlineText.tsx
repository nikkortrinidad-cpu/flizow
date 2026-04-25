import { useEffect, useRef, useState } from 'react';

/**
 * Inline-editable single-line text. Renders as plain text by default;
 * click → becomes an input; Enter or blur commits; Esc reverts.
 *
 * House rule (per the no-pencil design memo): no pencil icons. The
 * affordance is cursor:text on hover + a soft background tint + a
 * focus ring on the active editor. The user finds editability by
 * pointing at the text — same pattern as the breadcrumb rename and
 * the client hero name.
 *
 * `disabled` lets a parent gate the affordance behind a permission
 * check (e.g., the templates editor wraps every InlineText in
 * `useCanEditTemplates()` — false there means the field renders as
 * plain read-only text).
 *
 * Empty-string commits are silently rejected — the field reverts to
 * its previous value. The caller can override with
 * `allowEmpty: true` when an empty value is meaningful (rare).
 */
export function InlineText({
  value,
  onSave,
  disabled = false,
  allowEmpty = false,
  placeholder,
  className,
  ariaLabel,
  multiline = false,
  gesture = 'click',
}: {
  value: string;
  onSave: (next: string) => void;
  disabled?: boolean;
  allowEmpty?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  /** When true, renders a textarea instead of an input — Enter
   *  inserts a newline (Shift+Enter still commits, matching the
   *  card composer's gesture). */
  multiline?: boolean;
  /** Activation gesture for entering edit mode.
   *  - `'click'` (default): single-click on the value enters edit mode.
   *    The natural choice when nothing else competes for the click.
   *  - `'doubleClick'`: double-click enters edit mode. Use when the
   *    field sits inside a larger clickable container (e.g., the
   *    template phase name lives inside a row that single-click-
   *    toggles a checklist panel — single-click belongs to the
   *    container; the field needs a stronger gesture to claim edit).
   *    Keyboard activation (Enter/Space when focused) still works
   *    in both modes. */
  gesture?: 'click' | 'doubleClick';
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Sync draft to incoming value when not editing — covers the case
  // where the parent re-renders with a fresh value from the store
  // mid-mount (e.g., a different template selected).
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Focus + select-all when entering edit mode. rAF so the input is
  // in the DOM before we reach for it.
  useEffect(() => {
    if (!editing) return;
    const raf = requestAnimationFrame(() => {
      inputRef.current?.focus();
      if (inputRef.current && 'select' in inputRef.current) {
        inputRef.current.select();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [editing]);

  function commit() {
    const next = draft;
    if (!allowEmpty && !next.trim()) {
      setDraft(value);
      setEditing(false);
      return;
    }
    if (next === value) {
      setEditing(false);
      return;
    }
    onSave(next);
    setEditing(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (disabled) {
    // Read-only mode: render as plain text, no affordances.
    return <span className={className}>{value || placeholder || ''}</span>;
  }

  if (!editing) {
    const editLabel = gesture === 'doubleClick' ? 'double-click to edit' : 'click to edit';
    return (
      <span
        className={`${className ?? ''} inline-text-readonly`}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel ? `${ariaLabel} (${editLabel})` : editLabel}
        // Single click vs double click is decided by the `gesture`
        // prop. We also stop propagation so the parent click target
        // (e.g., a row that toggles a panel) doesn't fire its
        // handler when the field claims the click — except in
        // doubleClick mode, where we WANT the parent to handle the
        // single click. Keyboard activation always works via
        // Enter/Space when the span is focused.
        onClick={gesture === 'click' ? (e) => { e.stopPropagation(); setEditing(true); } : undefined}
        onDoubleClick={gesture === 'doubleClick' ? (e) => { e.stopPropagation(); setEditing(true); } : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setEditing(true);
          }
        }}
      >
        {value || (
          <span className="inline-text-placeholder">{placeholder ?? (gesture === 'doubleClick' ? 'Double-click to edit…' : 'Click to edit…')}</span>
        )}
      </span>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        className={`${className ?? ''} inline-text-input`}
        value={draft}
        rows={2}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          // Shift+Enter commits (mirrors card composer); plain Enter
          // adds a newline. Esc reverts.
          if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        }}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      className={`${className ?? ''} inline-text-input`}
      type="text"
      value={draft}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      }}
    />
  );
}
