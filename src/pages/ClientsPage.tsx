import { useMemo, useState } from 'react';
import { useRoute, navigate } from '../router';
import { useFlizow } from '../store/useFlizow';
import {
  servicePills,
  clientMetric,
  clientLastTouched,
  relativeTimeAgo,
} from '../utils/clientDerived';
import type { Client, ClientStatus } from '../types/flizow';

/**
 * Clients directory — the left (list) pane of the Mail.app-style split
 * view. The right pane renders from `ClientDetailPage`; both live inside
 * `ClientsSplit` so the layout can stay in a single `.clients-split-wrapper`.
 *
 * This file only renders the list. Wiring the detail pane, new-client
 * flow, pinned cards, and custom saved views lands in later passes.
 */

type SavedViewId = 'all' | 'mine' | 'fire' | 'risk' | 'track' | 'onboard' | 'paused';

interface SavedViewDef {
  id: SavedViewId;
  label: string;
  /** Optional status narrowing. `mine` filters by assignee, not status. */
  status?: ClientStatus;
}

const SAVED_VIEWS: SavedViewDef[] = [
  { id: 'all',     label: 'All' },
  { id: 'mine',    label: 'Assigned to me' },
  { id: 'fire',    label: 'On Fire',    status: 'fire' },
  { id: 'risk',    label: 'At Risk',    status: 'risk' },
  { id: 'track',   label: 'On Track',   status: 'track' },
  { id: 'onboard', label: 'Onboarding', status: 'onboard' },
  { id: 'paused',  label: 'Paused',     status: 'paused' },
];

export function ClientsPage() {
  const { data, store } = useFlizow();
  const route = useRoute();
  const selectedId = route.params.id ?? null;

  const [activeView, setActiveView] = useState<SavedViewId>('all');
  const [search, setSearch] = useState('');

  const currentMemberId = store.getCurrentMemberId();

  // Compute filtered rows + per-view counts in one pass so the chip labels
  // stay in lockstep with the list and we don't walk the client list
  // twice on every keystroke.
  const { filtered, counts } = useMemo(() => {
    return filterClients(data.clients, activeView, search, currentMemberId);
  }, [data.clients, activeView, search, currentMemberId]);

  const handleClear = () => {
    setSearch('');
    setActiveView('all');
  };

  return (
    <div className="view view-clients active" data-view="clients">
      <main className="clients-page">
        {/* Full-width header — CSS hides it inside .clients-split-wrapper,
            but we keep it so the same component still renders correctly
            if/when the page gets used outside the split. */}
        <div className="clients-header">
          <div className="clients-heading">
            <div className="clients-title">Clients</div>
            <div className="clients-count">{data.clients.length} active</div>
          </div>
        </div>

        {/* List-pane toolbar: search + count + add */}
        <div className="list-pane-toolbar">
          <label className="list-pane-search">
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
            </svg>
            <input
              type="search"
              placeholder="Search clients"
              aria-label="Search clients"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="list-pane-count" aria-label={`${filtered.length} clients in view`}>
            {filtered.length}
          </div>
          <button
            type="button"
            className="list-pane-add-btn"
            aria-label="Add client"
            // Add-client flow lands with the Client Detail pass; leaving
            // a deliberate hook rather than a silent no-op.
            onClick={() => window.alert('Add client flow ships with the Client Detail page.')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add client</span>
          </button>
        </div>

        <div className="clients-section-header">All Clients</div>

        <div className="saved-views-wrap">
          <div className="saved-views" role="tablist" aria-label="Saved views">
            {SAVED_VIEWS.map((view) => (
              <button
                key={view.id}
                type="button"
                role="tab"
                aria-selected={activeView === view.id}
                className={`view-chip${activeView === view.id ? ' active' : ''}`}
                onClick={() => setActiveView(view.id)}
              >
                {view.label}
                <span className="view-chip-count">{counts[view.id]}</span>
              </button>
            ))}
            <button
              type="button"
              className="view-chip new-view"
              aria-label="Create a custom view"
              onClick={() => window.alert('Custom saved views arrive with the Templates pass.')}
            >
              +
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="list-empty-state" role="status" aria-live="polite" style={{ display: 'flex' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div className="list-empty-title">No clients match</div>
            <div className="list-empty-sub">
              {data.clients.length === 0
                ? 'This workspace is empty. Add your first client to get started.'
                : 'Try a different search or saved view.'}
            </div>
            {data.clients.length > 0 && (
              <button type="button" className="list-empty-clear" onClick={handleClear}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="clients-list" role="list">
            <div className="clients-list-header">
              <div></div>
              <div>Client</div>
              <div>Services</div>
              <div>Account Manager</div>
              <div>Status</div>
              <div style={{ textAlign: 'right' }}>Updated</div>
              <div></div>
            </div>

            {filtered.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                selected={client.id === selectedId}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────

interface RowProps {
  client: Client;
  selected: boolean;
}

function ClientRow({ client, selected }: RowProps) {
  const { data } = useFlizow();
  const pills = servicePills(client, data.services);
  const metric = clientMetric(client, data);
  const lastTouched = clientLastTouched(client, data.tasks);
  const am = client.amId ? data.members.find(m => m.id === client.amId) : null;

  // Use an anchor so middle-click / cmd-click still works, but intercept
  // left-click so the router updates without a full hash round-trip.
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(`#clients/${client.id}`);
  };

  const statusTip = statusTooltip(client.status);

  return (
    <a
      href={`#clients/${client.id}`}
      data-client-id={client.id}
      className={`client-row${selected ? ' selected' : ''}`}
      role="listitem"
      onClick={handleClick}
    >
      <span
        className={`client-status-dot ${client.status}`}
        aria-label={statusTip}
        title={statusTip}
      />

      <div className="client-identity">
        <div className={`client-logo ${client.logoClass}`}>{client.initials}</div>
        <div className="client-identity-body">
          <div className="client-name">{client.name}</div>
          <div className="client-industry">{client.industry}</div>
        </div>
      </div>

      <div className="client-services">
        {pills.visible.map((name) => (
          <span key={name} className="service-pill">{name}</span>
        ))}
        {pills.overflow > 0 && (
          <span
            className="service-pill more"
            title={`${pills.overflow} more service${pills.overflow === 1 ? '' : 's'}`}
          >
            +{pills.overflow}
          </span>
        )}
      </div>

      <div className="client-am">
        {am ? (
          <>
            <div className="client-am-avatar" style={{ background: am.color }}>
              {am.initials}
            </div>
            <div className="client-am-name">{am.name}</div>
          </>
        ) : (
          <div className="client-am-name" style={{ color: 'var(--text-faint)' }}>—</div>
        )}
      </div>

      <div className={`client-metric${metric.urgent ? ' urgent' : ''}`}>
        {metric.text}
      </div>

      <div className="client-timestamp">
        {relativeTimeAgo(lastTouched, data.today)}
      </div>

      <span className="client-chevron" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </span>
    </a>
  );
}

function statusTooltip(status: ClientStatus): string {
  switch (status) {
    case 'fire':    return 'On fire — needs attention now';
    case 'risk':    return 'At risk — review soon';
    case 'onboard': return 'Onboarding — first 30 days';
    case 'paused':  return 'Paused — retainer on hold';
    case 'track':
    default:        return 'On track';
  }
}

// ── Filtering ─────────────────────────────────────────────────────────────

interface FilterResult {
  filtered: Client[];
  counts: Record<SavedViewId, number>;
}

/**
 * One-pass filter that returns the rows to render AND the tab counts for
 * every saved view. Counts always reflect the current search, so the
 * chips stay honest as the user types — you never see "At Risk 6" when
 * there are zero matches for the query.
 */
function filterClients(
  clients: Client[],
  activeView: SavedViewId,
  search: string,
  currentMemberId: string | null,
): FilterResult {
  const q = search.trim().toLowerCase();
  const counts: Record<SavedViewId, number> = {
    all: 0, mine: 0, fire: 0, risk: 0, track: 0, onboard: 0, paused: 0,
  };

  const matchesSearch = (c: Client): boolean => {
    if (!q) return true;
    return c.name.toLowerCase().includes(q)
        || c.industry.toLowerCase().includes(q);
  };

  const matchesMine = (c: Client): boolean => {
    if (!currentMemberId) return false;
    return c.amId === currentMemberId;
  };

  const filtered: Client[] = [];
  for (const c of clients) {
    if (!matchesSearch(c)) continue;

    // Tally every view this client qualifies for — the chip counts are
    // independent from which view the user has active right now.
    counts.all += 1;
    if (matchesMine(c)) counts.mine += 1;
    switch (c.status) {
      case 'fire':    counts.fire    += 1; break;
      case 'risk':    counts.risk    += 1; break;
      case 'track':   counts.track   += 1; break;
      case 'onboard': counts.onboard += 1; break;
      case 'paused':  counts.paused  += 1; break;
    }

    // Gate the rendered list by the active view.
    const def = SAVED_VIEWS.find(v => v.id === activeView)!;
    if (def.id === 'all') { filtered.push(c); continue; }
    if (def.id === 'mine') {
      if (matchesMine(c)) filtered.push(c);
      continue;
    }
    if (def.status && c.status === def.status) filtered.push(c);
  }

  return { filtered, counts };
}
