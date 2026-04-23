import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../router';
import { useFlizow } from '../store/useFlizow';
import type { Client, Task, ClientStatus } from '../types/flizow';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TAGLINES = [
  "Here's what needs you today.",
  'Your projects at a glance.',
  "Let's make today count.",
  "Here's where things stand.",
  'Your day, mapped out.',
  "What's on your plate today.",
  'The rundown for today.',
  'Stay ahead of the curve.',
  'Quick look at what matters.',
  'Everything in one place.',
  'Your priorities, front and center.',
  "Here's the view from above.",
  "Let's keep things moving.",
  'Your pulse check for today.',
];

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstNameOf(displayName: string | null | undefined): string {
  if (!displayName) return 'there';
  return displayName.split(' ')[0] || 'there';
}

function taglineForDay(now: Date): string {
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86_400_000);
  return TAGLINES[dayOfYear % TAGLINES.length];
}

export function OverviewPage() {
  const { user } = useAuth();
  const { data } = useFlizow();
  const [weekTab, setWeekTab] = useState<'current' | 'next'>('current');
  const now = new Date();
  const greetingLine = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  const title = `${greetingFor(now.getHours())}, ${firstNameOf(user?.displayName)}.`;
  const tagline = taglineForDay(now);

  // Portfolio health counts, computed from live client statuses. `active`
  // is everything that isn't paused — the Overview is about what's in
  // play, so a paused retainer doesn't count toward "active clients"
  // but still lives on the Clients page. Memoized because it recomputes
  // on every client write otherwise.
  const health = useMemo(() => {
    const byStatus: Record<ClientStatus, number> = {
      fire: 0, risk: 0, track: 0, onboard: 0, paused: 0,
    };
    for (const c of data.clients) byStatus[c.status]++;
    return {
      fire: byStatus.fire,
      risk: byStatus.risk,
      track: byStatus.track,
      active: data.clients.length - byStatus.paused,
    };
  }, [data.clients]);

  // Needs-attention cards — the clients you actually need to open today.
  // Order: fire first, then risk, capped at 6 so the block stays scannable.
  // Overflow spills into a "View all" link rather than an ever-growing list.
  const attention = useMemo(() => {
    return buildAttentionCards(data.clients, data.tasks).slice(0, 6);
  }, [data.clients, data.tasks]);
  const hiddenAttention = useMemo(() => {
    return Math.max(
      0,
      data.clients.filter(c => c.status === 'fire' || c.status === 'risk').length - attention.length,
    );
  }, [data.clients, attention.length]);

  return (
    <div className="view view-overview active">
      <main className="page">
        <div className="page-header">
          <div className="page-greeting">{greetingLine}</div>
          <div className="page-title">{title}</div>
          <div className="page-date">{tagline}</div>
        </div>

        {/* BLOCK 1 — Portfolio Health */}
        <div className="block" data-block-id="health">
          <div className="block-header">
            <div className="block-title">Portfolio Health</div>
            <div className="block-sub"><span>Across {health.active} active clients</span></div>
          </div>
          <div className="health-strip">
            <HealthCell
              label="On Fire"
              value={health.fire}
              sub="needs you now"
              valueClass="urgent"
              iconClass="alert"
              onClick={() => navigate('#clients')}
              ariaLabel="View On Fire clients"
              icon={<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />}
            />
            <div className="health-divider" />
            <HealthCell
              label="At Risk"
              value={health.risk}
              sub="need review"
              onClick={() => navigate('#clients')}
              ariaLabel="View At Risk clients"
              icon={<>
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </>}
            />
            <div className="health-divider" />
            <HealthCell
              label="On Track"
              value={health.track}
              sub="clients healthy"
              onClick={() => navigate('#clients')}
              ariaLabel="View On Track clients"
              icon={<polyline points="20 6 9 17 4 12" />}
            />
          </div>
        </div>

        {/* BLOCK 2 — Needs Your Attention */}
        <div className="block" data-block-id="attention">
          <div className="block-header">
            <div className="block-title">Needs Your Attention</div>
          </div>
          <div className="attention-list">
            {attention.length === 0 ? (
              <div className="attn-empty" style={{ padding: 24, color: 'var(--text-soft)', fontSize: 14 }}>
                Nothing urgent right now. Enjoy the quiet.
              </div>
            ) : (
              <>
                {attention.map((card) => (
                  <div
                    key={card.clientId}
                    className={`attn-card ${card.severity === 'critical' ? 'critical' : 'warn'}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${card.clientName}`}
                    onClick={() => navigate(`#clients/${card.clientId}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`#clients/${card.clientId}`);
                      }
                    }}
                  >
                    <div className="attn-content">
                      <div className="attn-row1">
                        <span className={`attn-severity ${card.severity === 'critical' ? 'critical' : 'warning'}`}>
                          <span className="dot" />{card.severityLabel}
                        </span>
                        <span className="attn-client">{card.clientName}</span>
                        <span className="attn-age">{card.ageLabel}</span>
                      </div>
                      <div className="attn-title">{card.title}</div>
                      {card.desc && <div className="attn-desc">{card.desc}</div>}
                    </div>
                  </div>
                ))}
                {hiddenAttention > 0 && (
                  <a
                    className="attn-more"
                    href="#clients"
                    style={{ textDecoration: 'none' }}
                    aria-label={`View all ${attention.length + hiddenAttention} clients needing attention`}
                  >
                    View all {attention.length + hiddenAttention} →
                  </a>
                )}
              </>
            )}
          </div>
        </div>

        {/* BLOCK 4 — Schedule */}
        <div className="block" data-block-id="schedule">
          <div className="block-header">
            <div className="block-title">Schedule</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="week-tabs">
                <button
                  type="button"
                  className={`week-tab ${weekTab === 'current' ? 'active' : ''}`}
                  onClick={() => setWeekTab('current')}
                >
                  This week
                </button>
                <button
                  type="button"
                  className={`week-tab ${weekTab === 'next' ? 'active' : ''}`}
                  onClick={() => setWeekTab('next')}
                >
                  Next week
                </button>
              </div>
            </div>
          </div>
          <div className="week-board">
            <div style={{ padding: 24, color: 'var(--text-soft)', fontSize: 14 }}>
              {weekTab === 'current' ? 'No meetings scheduled this week.' : 'No meetings scheduled next week.'}
            </div>
          </div>
        </div>

        {/* BLOCK 5 — My Boards */}
        <div className="block" data-block-id="myboards">
          <div className="block-header">
            <div className="block-title">My Boards</div>
          </div>
          <div className="pinned-wrap pinned-wrap--inline">
            <div className="pinned-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <div>
                <div className="pinned-empty-title">No boards favorited yet</div>
                <div className="pinned-empty-sub">Open any client and tap the star on a service to pin its board here.</div>
              </div>
              <a className="pinned-empty-cta" href="#clients">Browse clients →</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

type HealthCellProps = {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  valueClass?: string;
  iconClass?: string;
};

type AttentionCard = {
  clientId: string;
  clientName: string;
  severity: 'critical' | 'warning';
  severityLabel: 'On Fire' | 'At Risk';
  title: string;
  ageLabel: string;
  desc?: string;
};

// Why we group by client (not by task): the AM's first move when the
// Overview surfaces something urgent is to open the client and look at
// the whole picture — which service is bleeding, what the last touchpoint
// said, whether a retainer is up for renewal. A card per task would push
// the same client 3x when they have three overdue items, which trains
// the eye to ignore repeats instead of act on them.
function buildAttentionCards(clients: Client[], tasks: Task[]): AttentionCard[] {
  const fire = clients.filter((c) => c.status === 'fire');
  const risk = clients.filter((c) => c.status === 'risk');
  const ordered = [...fire, ...risk];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  return ordered.map((c) => {
    const isCritical = c.status === 'fire';
    const openTasks = tasks.filter((t) => t.clientId === c.id && t.columnId !== 'done');
    const overdue = openTasks.filter((t) => {
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() < todayMs;
    });
    const blocked = openTasks.filter((t) => t.columnId === 'blocked');

    let title: string;
    if (overdue.length && blocked.length) {
      title = `${overdue.length} overdue · ${blocked.length} blocked`;
    } else if (overdue.length) {
      title = overdue.length === 1 ? '1 overdue card' : `${overdue.length} overdue cards`;
    } else if (blocked.length) {
      title = blocked.length === 1 ? '1 blocked card' : `${blocked.length} blocked cards`;
    } else if (isCritical) {
      title = 'Marked on fire — no blocker logged yet';
    } else {
      title = 'Drifting — time for a check-in';
    }

    // Age label: anchored on the oldest overdue task if we have one, so
    // the AM sees the worst-case staleness at a glance. Falls back to a
    // status hint when there's nothing measurably late.
    let ageLabel: string;
    if (overdue.length) {
      let oldestDueMs = Infinity;
      for (const t of overdue) {
        const due = new Date(t.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due.getTime() < oldestDueMs) oldestDueMs = due.getTime();
      }
      const days = Math.max(1, Math.floor((todayMs - oldestDueMs) / 86_400_000));
      ageLabel = days === 1 ? '1 day overdue' : `${days} days overdue`;
    } else if (blocked.length) {
      ageLabel = 'Blocked';
    } else {
      ageLabel = 'Needs review';
    }

    // Optional longer sentence when a blocker reason is present —
    // surfaces the human context ("waiting on brand assets") so the AM
    // can triage without opening the card.
    let desc: string | undefined;
    const firstBlocker = blocked.find((t) => t.blockerReason)?.blockerReason;
    if (firstBlocker) {
      desc = `Blocked: ${firstBlocker}`;
    }

    return {
      clientId: c.id,
      clientName: c.name,
      severity: isCritical ? 'critical' : 'warning',
      severityLabel: isCritical ? 'On Fire' : 'At Risk',
      title,
      ageLabel,
      desc,
    };
  });
}

function HealthCell({ label, value, sub, icon, onClick, ariaLabel, valueClass, iconClass }: HealthCellProps) {
  return (
    <div
      className="health-cell clickable"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <div className={`health-icon${iconClass ? ` ${iconClass}` : ''}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <div>
        <div className="health-label">{label}</div>
        <div className={`health-value${valueClass ? ` ${valueClass}` : ''}`}>{value}</div>
        <div className="health-sub">{sub}</div>
      </div>
    </div>
  );
}
