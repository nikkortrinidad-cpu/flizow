import { useEffect, useMemo, useState } from 'react';
import { useRoute, navigate } from '../router';
import { useFlizow } from '../store/useFlizow';
import type { Client, Service, Task, Member, FlizowData, ClientStatus } from '../types/flizow';
import { formatMonthYear, formatMonthDay, formatMrr, daysBetween } from '../utils/dateFormat';

/**
 * Right-hand pane of the Clients split view. Ports the Acme detail layout
 * (`<section class="client-detail-page">` in the mockup) and drives tab
 * switching from local state — URL stays at `#clients/{id}` so that hitting
 * Back from a service board always lands you where you started, rather
 * than on the last tab you peeked at.
 *
 * Overview tab is fully wired (hero, needs-attention, services strip,
 * recent activity). The other five tabs render a short placeholder that
 * points at the next port pass.
 */

type TabKey = 'overview' | 'onboarding' | 'about' | 'stats' | 'touchpoints' | 'notes';

interface TabDef {
  key: TabKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'overview',    label: 'Overview' },
  { key: 'onboarding',  label: 'Onboarding' },
  { key: 'about',       label: 'About' },
  { key: 'stats',       label: 'Stats' },
  { key: 'touchpoints', label: 'Touchpoints' },
  { key: 'notes',       label: 'Notes' },
];

export function ClientDetailPage() {
  const route = useRoute();
  const { data } = useFlizow();
  const id = route.params.id ?? null;
  const client = id ? data.clients.find(c => c.id === id) ?? null : null;

  return (
    <div className="view view-client-detail active" data-view="client-detail">
      {client ? <ClientDetail client={client} data={data} /> : <EmptyState />}
    </div>
  );
}

// ── Empty (no client selected) ────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="detail-empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        <path d="M3 7l9 6 9-6" />
      </svg>
      <div className="detail-empty-title">Select a client</div>
      <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text-faint)' }}>
        Pick a row on the left to see their services, activity, and notes.
      </div>
    </div>
  );
}

// ── Top-level detail layout ───────────────────────────────────────────────

interface DetailProps {
  client: Client;
  data: FlizowData;
}

function ClientDetail({ client, data }: DetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Reset to Overview whenever the user lands on a different client, so the
  // first thing they see on a new row isn't whatever tab they peeked at on
  // the previous one.
  useEffect(() => {
    setActiveTab('overview');
  }, [client.id]);

  const am = client.amId ? data.members.find(m => m.id === client.amId) ?? null : null;
  const services = useMemo(
    () => data.services.filter(s => s.clientId === client.id),
    [data.services, client.id],
  );
  const openTasks = useMemo(
    () => data.tasks.filter(t => t.clientId === client.id && t.columnId !== 'done'),
    [data.tasks, client.id],
  );

  return (
    <section
      className="client-detail-page"
      data-client-panel={client.id}
      data-active-tab={activeTab}
    >
      <Hero client={client} am={am} />
      <TabsRow tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <>
          <AttentionSection client={client} tasks={openTasks} services={services} />
          <ServicesSection services={services} />
          <ActivitySection client={client} tasks={data.tasks} members={data.members} todayISO={data.today} />
        </>
      )}

      {activeTab !== 'overview' && <TabPlaceholder tab={activeTab} />}
    </section>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────

function Hero({ client, am }: { client: Client; am: Member | null }) {
  const statusLabel = statusChipLabel(client.status);

  return (
    <div className="client-hero">
      <div className={`hero-logo ${client.logoClass}`}>
        <span className="hero-logo-initials">{client.initials}</span>
      </div>
      <div className="hero-body">
        <div className="hero-name-row">
          <span className="hero-name">{client.name}</span>
          <span
            className={`status-chip ${client.status}`}
            title="Auto-computed from attention items, onboarding progress, and activity"
          >
            <span className="dot" />
            {statusLabel}
          </span>
        </div>
        <div className="hero-meta">
          <span className="hero-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            <span>{client.industry}</span>
          </span>

          {am && (
            <>
              <span className="meta-dot" />
              <span className="hero-meta-item">
                <span className="hero-meta-label">Manager:</span>
                <span className="hero-am-avatar" style={{ background: am.color }}>{am.initials}</span>
                <span>{am.name}</span>
              </span>
            </>
          )}

          {client.startedAt && (
            <>
              <span className="meta-dot" />
              <span className="hero-meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Client since {formatMonthYear(client.startedAt)}</span>
              </span>
            </>
          )}

          {client.mrr > 0 && (
            <>
              <span className="meta-dot" />
              <span className="hero-billing">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <span><strong>{formatMrr(client.mrr)}</strong>/mo</span>
                {client.renewsAt && (
                  <span className="renew">· Renews {formatMonthDay(client.renewsAt)}</span>
                )}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tabs row ──────────────────────────────────────────────────────────────

interface TabsRowProps {
  tabs: TabDef[];
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

function TabsRow({ tabs, activeTab, onChange }: TabsRowProps) {
  return (
    <div className="client-tabs-row">
      <div className="client-tabs" role="tablist" aria-label="Client sections">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className="client-tab"
            data-active={activeTab === tab.key ? 'true' : undefined}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Overview · Needs Attention ────────────────────────────────────────────

function AttentionSection({ client, tasks, services }: {
  client: Client;
  tasks: Task[];
  services: Service[];
}) {
  const chips = useMemo(() => buildAttentionChips(client, tasks, services), [client, tasks, services]);

  if (chips.length === 0) {
    // No urgent signals — say so directly rather than render an empty block.
    return (
      <div className="detail-section">
        <div className="detail-section-header">
          <div className="detail-section-title">Needs attention</div>
          <div className="detail-section-sub">As of this morning</div>
        </div>
        <div
          className="attention-panel"
          style={{ padding: 20, color: 'var(--text-soft)', fontSize: 14 }}
        >
          Nothing's on fire right now. You're good.
        </div>
      </div>
    );
  }

  return (
    <div className="detail-section">
      <div className="detail-section-header">
        <div className="detail-section-title">Needs attention</div>
        <div className="detail-section-sub">As of this morning</div>
      </div>
      <div className="attention-panel">
        {chips.map((chip) => (
          <a
            key={chip.key}
            href={chip.href}
            className={`attention-chip${chip.tint ? ` ${chip.tint}` : ''}`}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              navigate(chip.href);
            }}
          >
            <span className="attention-chip-icon">{chip.icon}</span>
            <span className="attention-chip-body">
              <span className="attention-chip-value">{chip.value}</span>
              <span className="attention-chip-label">{chip.label}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

interface AttentionChip {
  key: string;
  value: string;
  label: string;
  tint?: 'fire' | 'warn';
  href: string;
  icon: React.ReactNode;
}

/** Build the attention strip from the live task state. Keeping this as a
 *  pure function makes the "no signal, nothing to show" path trivially
 *  testable and keeps render code free of branching. */
function buildAttentionChips(
  client: Client,
  openTasks: Task[],
  services: Service[],
): AttentionChip[] {
  const out: AttentionChip[] = [];

  // 1. Overdue cards — the loudest thing a row can carry.
  const overdue = openTasks.filter(t => t.severity === 'critical' || t.columnId === 'blocked');
  if (overdue.length > 0) {
    // Point at the first offending service so clicking takes you somewhere
    // useful rather than to a generic list.
    const firstServiceId = overdue[0].serviceId;
    const serviceName = services.find(s => s.id === firstServiceId)?.name ?? 'Work';
    out.push({
      key: 'overdue',
      value: `${overdue.length} card${overdue.length === 1 ? '' : 's'} past due`,
      label: `${serviceName} · tap to open`,
      tint: 'fire',
      href: `#board/${firstServiceId}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      ),
    });
  }

  // 2. Warning-severity tasks (at-risk drafts, blocked-ish work).
  const atRisk = openTasks.filter(t => t.severity === 'warning');
  if (atRisk.length > 0) {
    const firstServiceId = atRisk[0].serviceId;
    const serviceName = services.find(s => s.id === firstServiceId)?.name ?? 'Work';
    out.push({
      key: 'risk',
      value: `${atRisk.length} at risk`,
      label: `${serviceName} · review soon`,
      tint: 'warn',
      href: `#board/${firstServiceId}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    });
  }

  // 3. Renewal within 30 days — a gentle heads-up, never urgent.
  if (client.renewsAt) {
    const days = daysBetween(new Date().toISOString().slice(0, 10), client.renewsAt);
    if (days >= 0 && days <= 30) {
      out.push({
        key: 'renewal',
        value: days === 0 ? 'Renews today' : `Renews in ${days}d`,
        label: `${formatMonthDay(client.renewsAt)} · finance pings this automatically`,
        href: `#clients/${client.id}`,
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        ),
      });
    }
  }

  return out;
}

// ── Overview · Active Services ────────────────────────────────────────────

function ServicesSection({ services }: { services: Service[] }) {
  if (services.length === 0) {
    return (
      <div className="detail-section">
        <div className="detail-section-header">
          <div className="detail-section-title">Active Services</div>
          <div className="detail-section-sub">No services yet</div>
        </div>
        <div
          className="services-list"
          style={{ padding: 20, color: 'var(--text-soft)', fontSize: 14 }}
        >
          Nothing is running for this client yet. Add a service to spin up a board.
        </div>
      </div>
    );
  }

  const projects = services.filter(s => s.type === 'project').length;
  const retainers = services.filter(s => s.type === 'retainer').length;

  return (
    <div className="detail-section">
      <div className="detail-section-header">
        <div className="detail-section-title">Active Services</div>
        <div className="detail-section-sub">
          {services.length} of {services.length} · {projects} project{projects === 1 ? '' : 's'}, {retainers} retainer{retainers === 1 ? '' : 's'}
        </div>
      </div>
      <div className="services-list" data-services-list>
        {services.map(s => <ServiceCard key={s.id} service={s} />)}
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    navigate(`#board/${service.id}`);
  };
  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate(`#board/${service.id}`);
    }
  };

  return (
    <div
      className="service-card"
      role="link"
      tabIndex={0}
      aria-label={`Open board for ${service.name}`}
      onClick={handleClick}
      onKeyDown={handleKey}
    >
      <div className="service-icon logo-indigo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      </div>
      <div className="service-card-body">
        <div className="service-name-row">
          <div className="service-name">{service.name}</div>
          <span className={`service-type ${service.type}`}>
            {service.type === 'project' ? 'Project' : 'Retainer'}
          </span>
        </div>
        <div className="service-sub">
          Template: {humanTemplate(service.templateKey)}
          {service.nextDeliverableAt && (
            <>
              <span className="sep">·</span>
              {service.type === 'project'
                ? `Due ${formatMonthDay(service.nextDeliverableAt)}`
                : `Next ${formatMonthDay(service.nextDeliverableAt)}`}
            </>
          )}
        </div>
      </div>
      <div className="service-progress">
        <div className="service-progress-label">
          <span>{service.type === 'project' ? 'Progress' : 'This month'}</span>
          <strong>{service.progress}%</strong>
        </div>
        <div className="service-progress-bar">
          <div className="service-progress-fill" style={{ width: `${service.progress}%` }} />
        </div>
      </div>
    </div>
  );
}

function humanTemplate(key: string): string {
  // Template keys come from a closed union in types/flizow; this is the
  // display-side reverse — it's a lookup, not a fallback, so adding a new
  // key shows up as a literal here until someone labels it.
  const MAP: Record<string, string> = {
    demandgen:   'Demand Gen',
    contentSEO:  'Content + SEO',
    launch:      'Product Launch',
    cro:         'CRO Sprint',
    paidSocial:  'Paid Social',
    email:       'Email Lifecycle',
    seasonal:    'Seasonal Campaign',
    localSEO:    'Local SEO',
    paidLead:    'Paid Lead Gen',
    reputation:  'Reputation',
    social:      'Social Retainer',
    photo:       'Photo / Video',
    linkedin:    'LinkedIn Growth',
    website:     'Website Build',
    'web-design-full-stack': 'Web Design — Full Stack',
    'brand-refresh':         'Brand Refresh',
  };
  return MAP[key] ?? key;
}

// ── Overview · Recent Activity ────────────────────────────────────────────

function ActivitySection({ client, tasks, members, todayISO }: {
  client: Client;
  tasks: Task[];
  members: Member[];
  todayISO: string;
}) {
  // We don't have a real activity log yet — synthesize a light feed from
  // the latest task events for this client so the section doesn't stay
  // empty. This gets ripped out the moment activity logging lands.
  const items = useMemo(
    () => synthesizeActivity(client, tasks, members, todayISO),
    [client, tasks, members, todayISO],
  );

  if (items.length === 0) {
    return (
      <div className="detail-section">
        <div className="detail-section-header">
          <div className="detail-section-title">Recent Activity</div>
        </div>
        <div style={{ padding: 20, color: 'var(--text-soft)', fontSize: 14 }}>
          Nothing logged yet. As the team works, this feed will fill in.
        </div>
      </div>
    );
  }

  return (
    <div className="detail-section">
      <div className="detail-section-header">
        <div className="detail-section-title">Recent Activity</div>
      </div>
      <div className="activity-list">
        {items.map((item) => (
          <div className="activity-item" key={item.key}>
            <span
              className="activity-dot"
              style={item.dotColor ? { background: item.dotColor } : undefined}
            />
            <div className="activity-text">
              <strong>{item.actor}</strong>{' '}
              <span className="subject">{item.subject}</span>
            </div>
            <span className="activity-time">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ActivityItem {
  key: string;
  actor: string;
  subject: string;
  time: string;
  dotColor?: string;
}

function synthesizeActivity(
  client: Client,
  tasks: Task[],
  members: Member[],
  todayISO: string,
): ActivityItem[] {
  const recent = tasks
    .filter(t => t.clientId === client.id)
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 5);

  return recent.map((task, i) => {
    const assignee = task.assigneeId
      ? members.find(m => m.id === task.assigneeId)
      : null;
    const actor = assignee?.name.split(' ')[0] ?? 'Someone';
    const subject = verbFor(task) + ' "' + task.title + '"';
    return {
      key: `${task.id}-${i}`,
      actor,
      subject,
      time: quickTime(task.createdAt, todayISO),
      dotColor: dotFor(task),
    };
  });
}

function verbFor(task: Task): string {
  if (task.columnId === 'blocked') return 'flagged a blocker on';
  if (task.columnId === 'review')  return 'moved to review';
  if (task.columnId === 'done')    return 'marked complete';
  if (task.columnId === 'inprogress') return 'started';
  return 'opened';
}

function dotFor(task: Task): string | undefined {
  if (task.severity === 'critical' || task.columnId === 'blocked') return 'var(--status-fire)';
  if (task.severity === 'warning') return 'var(--status-risk)';
  if (task.columnId === 'done')    return 'var(--status-track)';
  return undefined;
}

function quickTime(createdAt: string, todayISO: string): string {
  const days = daysBetween(createdAt, todayISO);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return formatMonthDay(createdAt);
}

// ── Tabs that haven't been ported yet ─────────────────────────────────────

function TabPlaceholder({ tab }: { tab: Exclude<TabKey, 'overview'> }) {
  const LABELS: Record<Exclude<TabKey, 'overview'>, string> = {
    onboarding:  'Onboarding checklist',
    about:       'Relationship & contacts',
    stats:       'Stats hub',
    touchpoints: 'Touchpoint log',
    notes:       'Internal notes',
  };
  return (
    <div className="detail-section">
      <div
        style={{
          padding: 24, borderRadius: 12,
          border: '1px dashed var(--hairline)',
          textAlign: 'center',
          color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          {LABELS[tab]}
        </div>
        This tab ports in the next pass.
      </div>
    </div>
  );
}

// ── Misc ──────────────────────────────────────────────────────────────────

function statusChipLabel(status: ClientStatus): string {
  switch (status) {
    case 'fire':    return 'On Fire';
    case 'risk':    return 'At Risk';
    case 'onboard': return 'Onboarding';
    case 'paused':  return 'Paused';
    case 'track':
    default:        return 'On Track';
  }
}
