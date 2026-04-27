import { useEffect, useRef, type ReactNode } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

/**
 * Shared multi-select dropdown with a search input and a scrollable
 * option list. Was extracted from AssigneePicker + LabelPicker inside
 * FlizowCardModal — the two were ~95% the same code (autofocus,
 * outside-click dismiss, capture-phase Esc, query-filter) with only
 * the data source and chip shape differing.
 *
 * Keeping the behaviour here means a future focus-timing or keyboard
 * fix lands once instead of in two near-identical places. Callers
 * still pass their own CSS classes so existing styling doesn't need
 * to change — the audit was about *behavioural* drift, not visual
 * consistency. Audit: card-modal M1.
 */

export interface PickerClasses {
  /** Root dropdown container (e.g. `.assignee-dropdown`). */
  root: string;
  /** Search input (e.g. `.assignee-search`). */
  search: string;
  /** Scrollable list wrapper (e.g. `.assignee-list`). */
  list: string;
  /** Option button base class (e.g. `.assignee-option`). */
  option: string;
  /** Empty-state message div (e.g. `.assignee-empty`). */
  empty: string;
}

interface Props<T> {
  /** Source data. Filtering happens inside the component so the
   *  caller doesn't re-implement the query-lowercase dance. */
  items: T[];
  /** CSS class bundle — lets AssigneePicker and LabelPicker keep
   *  their existing visual shells without cross-contamination. */
  classes: PickerClasses;
  /** Placeholder copy for the search input. */
  placeholder: string;
  /** Current query string, lifted so the caller can clear it on close. */
  query: string;
  onQueryChange: (q: string) => void;
  /** Case-insensitive match test. Receives the query pre-lowercased
   *  because every caller was calling .toLowerCase() once per render
   *  outside this component anyway. */
  matches: (item: T, lowerQuery: string) => boolean;
  /** Stable id → React key + selection identity + toggle payload. */
  getKey: (item: T) => string;
  /** True when this item is already in the selection. */
  isSelected: (item: T) => boolean;
  onToggle: (id: string) => void;
  /** Renders the visual contents inside the option button — the avatar,
   *  name, label pill, role, etc. The outer <button> + checkmark svg +
   *  `.is-selected` state are owned by this component. */
  renderItem: (item: T) => ReactNode;
  /** Class for the trailing checkmark svg (e.g.
   *  `.assignee-option-check`). Checkmark visibility flips via the
   *  option's `.is-selected` modifier in CSS. */
  checkClassName: string;
  /** Copy shown when `items.filter(matches) === []`. */
  emptyLabel: string;
  onClose: () => void;
}

export function SearchablePicker<T>({
  items, classes, placeholder,
  query, onQueryChange,
  matches, getKey, isSelected, onToggle, renderItem,
  checkClassName, emptyLabel,
  onClose,
}: Props<T>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Autofocus on mount so the user can start typing immediately.
    // The setTimeout(0) on the listener registrations defers them
    // past the opening click's bubbling phase — without it, the
    // click that opened the picker would immediately register as
    // an outside-click and close it.
    searchRef.current?.focus();
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    }
    const t = window.setTimeout(() => {
      document.addEventListener('mousedown', onDoc);
      document.addEventListener('keydown', onKey, true);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter(item => matches(item, q)) : items;

  return (
    <div
      ref={ref}
      className={`${classes.root} open`}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={searchRef}
        type="text"
        className={classes.search}
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <div className={classes.list}>
        {filtered.length === 0 ? (
          <div className={classes.empty}>{emptyLabel}</div>
        ) : (
          filtered.map(item => {
            const selected = isSelected(item);
            const key = getKey(item);
            return (
              <button
                key={key}
                type="button"
                className={`${classes.option}${selected ? ' is-selected' : ''}`}
                onClick={() => onToggle(key)}
                // Real <button> for free keyboard activation — Enter
                // and Space both trigger onClick out of the box.
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 0,
                  padding: 'var(--sp-xs) var(--sp-sm)',
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                }}
              >
                {renderItem(item)}
                <CheckIcon className={checkClassName} aria-hidden="true" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
