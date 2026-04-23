import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../router';

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
  const [weekTab, setWeekTab] = useState<'current' | 'next'>('current');
  const now = new Date();
  const greetingLine = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  const title = `${greetingFor(now.getHours())}, ${firstNameOf(user?.displayName)}.`;
  const tagline = taglineForDay(now);

  // Portfolio health counts — stubbed with demo values matching the mockup's
  // defaults. Replaced by real counts once the unified store lands.
  const health = { fire: 1, risk: 2, track: 5, active: 8 };

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
            <div className="attn-empty" style={{ padding: 24, color: 'var(--text-soft)', fontSize: 14 }}>
              Nothing urgent right now. Enjoy the quiet.
            </div>
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
