import { useEffect, useMemo, useState } from 'react';
import { useRoute, navigate } from '../router';
import { useFlizow } from '../store/useFlizow';
import type {
  Client, Service, Task, Member, FlizowData, ClientStatus,
  OnboardingItem, Contact, QuickLink,
} from '../types/flizow';
import type { FlizowStore } from '../store/flizowStore';
import { formatMonthYear, formatMonthDay, formatMrr, daysBetween } from '../utils/dateFormat';
import { NotesTab } from '../components/NotesTab';
import { TouchpointsTab } from '../components/TouchpointsTab';

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
  const { data, store } = useFlizow();
  const id = route.params.id ?? null;
  const client = id ? data.clients.find(c => c.id === id) ?? null : null;

  return (
    <div className="view view-client-detail active" data-view="client-detail">
      {client ? <ClientDetail client={client} data={data} store={store} /> : <EmptyState />}
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
  store: FlizowStore;
}

function ClientDetail({ client, data, store }: DetailProps) {
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
  const clientOnboarding = useMemo(() => {
    const svcIds = new Set(services.map(s => s.id));
    return data.onboardingItems.filter(o => svcIds.has(o.serviceId));
  }, [data.onboardingItems, services]);

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

      {activeTab === 'onboarding' && (
        <OnboardingSection
          services={services}
          items={clientOnboarding}
          onToggle={(id) => store.toggleOnboardingItem(id)}
        />
      )}

      {activeTab === 'about' && (
        <AboutSection client={client} data={data} />
      )}

      {activeTab === 'notes' && (
        <NotesTab clientId={client.id} notes={data.notes} store={store} />
      )}

      {activeTab === 'touchpoints' && (
        <TouchpointsTab
          client={client}
          touchpoints={data.touchpoints}
          actionItems={data.actionItems}
          members={data.members}
          contacts={data.contacts}
          store={store}
          todayISO={data.today}
        />
      )}

      {activeTab !== 'overview'
        && activeTab !== 'onboarding'
        && activeTab !== 'about'
        && activeTab !== 'notes'
        && activeTab !== 'touchpoints' && (
        <TabPlaceholder tab={activeTab} />
      )}
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

// ── Onboarding tab ────────────────────────────────────────────────────────

/**
 * Setup checklist grouped by service. Each service is its own collapsible
 * card; completed services collapse by default so incomplete work is what
 * the user sees first. Checkboxes flip optimistically through the store
 * (local + Firestore debounce handles durability).
 *
 * Design notes, Apple-style:
 * - Clarity over ornament: one checkbox, one label, no icons on items.
 * - Hierarchy through count/progress — the eye lands on "3 of 7" first.
 * - Forgiveness: toggling is a flip, so an accidental tick is one more
 *   click to fix.
 * - Keyboard: head is a <button>, each check is a <button aria-pressed>.
 */
function OnboardingSection({ services, items, onToggle }: {
  services: Service[];
  items: OnboardingItem[];
  onToggle: (id: string) => void;
}) {
  const groups = useMemo(() => groupByService(services, items), [services, items]);

  // Header math: how many services still have open items, total items.
  const totalItems = items.length;
  const doneItems  = items.filter(i => i.done).length;
  const openServices = groups.filter(g => g.doneCount < g.total).length;

  if (services.length === 0) {
    return (
      <div className="detail-section">
        <div className="detail-section-header">
          <div className="detail-section-title">Setup & Onboarding</div>
          <div className="detail-section-sub">No services to set up yet</div>
        </div>
        <div
          className="onboarding-service-stack"
          style={{ padding: 20, color: 'var(--text-soft)', fontSize: 14 }}
        >
          Spin up a service to see its onboarding checklist here.
        </div>
      </div>
    );
  }

  if (totalItems === 0) {
    // Services exist but none carry a template checklist. Rare, but keep
    // the tab from rendering an empty stack.
    return (
      <div className="detail-section">
        <div className="detail-section-header">
          <div className="detail-section-title">Setup & Onboarding</div>
          <div className="detail-section-sub">No checklists for these services</div>
        </div>
        <div
          className="onboarding-service-stack"
          style={{ padding: 20, color: 'var(--text-soft)', fontSize: 14 }}
        >
          Setup checklists attach to services through templates. Swap in a
          template to see yours here.
        </div>
      </div>
    );
  }

  return (
    <div className="detail-section">
      <div className="detail-section-header">
        <div className="detail-section-title">Setup & Onboarding</div>
        <div className="detail-section-sub">
          {openServices === 0
            ? `All set · ${doneItems} of ${totalItems} items complete`
            : `${openServices} of ${services.length} service${services.length === 1 ? '' : 's'} in progress · ${doneItems} of ${totalItems} items complete`
          }
        </div>
      </div>
      <div className="onboarding-service-stack">
        {groups.map(g => (
          <OnboardingServiceCard key={g.service.id} group={g} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

interface OnboardingGroup {
  service: Service;
  client: OnboardingItem[];
  us: OnboardingItem[];
  doneCount: number;
  total: number;
}

function groupByService(services: Service[], items: OnboardingItem[]): OnboardingGroup[] {
  return services.map(service => {
    const svcItems = items.filter(i => i.serviceId === service.id);
    const client = svcItems.filter(i => i.group === 'client');
    const us     = svcItems.filter(i => i.group === 'us');
    const doneCount = svcItems.filter(i => i.done).length;
    return { service, client, us, doneCount, total: svcItems.length };
  });
}

function OnboardingServiceCard({ group, onToggle }: {
  group: OnboardingGroup;
  onToggle: (id: string) => void;
}) {
  const { service, client, us, doneCount, total } = group;
  const complete = total > 0 && doneCount === total;
  // Completed services collapse by default — the tab points the user at
  // unfinished setup first, not green checkmarks.
  const [collapsed, setCollapsed] = useState<boolean>(complete);
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const classes = [
    'onboarding-service-card',
    complete ? 'complete' : '',
    collapsed ? 'collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <button
        type="button"
        className="onboarding-service-head"
        onClick={() => setCollapsed(c => !c)}
        aria-expanded={!collapsed}
        aria-controls={`onb-body-${service.id}`}
      >
        <span className="onb-svc-icon" aria-hidden="true">
          {complete ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3 11h18" />
            </svg>
          )}
        </span>
        <span className="onb-svc-body">
          <span className="onb-svc-name">{service.name}</span>
          <span className="onb-svc-sub">
            {humanTemplate(service.templateKey)}
            {complete ? ' · setup complete' : ` · ${total - doneCount} item${total - doneCount === 1 ? '' : 's'} left`}
          </span>
        </span>
        <span className="onb-svc-progress">
          <span className="onb-svc-count">{doneCount}/{total}</span>
          <span className="onb-svc-bar">
            <span className="onb-svc-fill" style={{ width: `${percent}%` }} />
          </span>
        </span>
        <span className="onb-svc-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      <div id={`onb-body-${service.id}`} className="onboarding-service-body">
        <div className="onboarding-checklist">
          {client.length > 0 && (
            <>
              <div className="onboarding-group-label">Needed from client</div>
              {client.map(item => (
                <OnboardingRow key={item.id} item={item} onToggle={onToggle} />
              ))}
            </>
          )}
          {us.length > 0 && (
            <>
              <div className="onboarding-group-label">We take care of</div>
              {us.map(item => (
                <OnboardingRow key={item.id} item={item} onToggle={onToggle} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OnboardingRow({ item, onToggle }: {
  item: OnboardingItem;
  onToggle: (id: string) => void;
}) {
  return (
    <label
      className={`onboarding-item${item.done ? ' done' : ''}`}
      // The whole row is clickable for the same reason toggles on iOS let
      // you tap anywhere on the row: bigger target, fewer missed taps.
    >
      <button
        type="button"
        className="onboarding-check"
        role="checkbox"
        aria-checked={item.done}
        aria-label={`${item.done ? 'Mark as not done' : 'Mark as done'}: ${item.label}`}
        onClick={(e) => { e.preventDefault(); onToggle(item.id); }}
      >
        {item.done && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <span>{item.label}</span>
    </label>
  );
}

// ── About tab ─────────────────────────────────────────────────────────────

/**
 * Relationship + Team. View-only for now — the mockup exposes Manage/Edit
 * affordances that flip the surrounding cards into editable form, but the
 * inline-edit interaction pattern lands in the next pass once we have a
 * reusable <InlineField /> primitive to share with Notes and Touchpoints.
 * Keeping the read side clean and accessible today so the tab is useful
 * immediately rather than hidden behind a WIP flag.
 */
function AboutSection({ client, data }: { client: Client; data: FlizowData }) {
  const contacts = useMemo(
    () => data.contacts.filter(c => c.clientId === client.id)
      // Primary first, then original order. Small, consistent ordering
      // beats a per-session sort on name — the user learns where each
      // contact sits on the page.
      .sort((a, b) => Number(!!b.primary) - Number(!!a.primary)),
    [data.contacts, client.id],
  );
  const quickLinks = useMemo(
    () => data.quickLinks.filter(q => q.clientId === client.id),
    [data.quickLinks, client.id],
  );
  const am = client.amId ? data.members.find(m => m.id === client.amId) ?? null : null;
  const team = useMemo(
    () => client.teamIds
      .map(id => data.members.find(m => m.id === id))
      .filter((m): m is Member => !!m),
    [client.teamIds, data.members],
  );

  return (
    <>
      <div className="detail-section" data-tab="about">
        <div className="detail-section-header">
          <div className="detail-section-title">Relationship</div>
          <div className="detail-section-sub">Who we talk to, and where to find their stuff</div>
        </div>
        <div className="relationship-grid">
          <ContactsCard contacts={contacts} />
          <QuickLinksCard links={quickLinks} />
        </div>
      </div>

      <div className="detail-section" data-tab="about" data-team-section>
        <div className="detail-section-header">
          <div className="detail-section-title">Team</div>
          <div className="detail-section-sub">
            {am ? '1 account manager' : 'No account manager'}
            {team.length > 0 && ` · ${team.length} operator${team.length === 1 ? '' : 's'}`}
          </div>
        </div>
        <TeamGrid am={am} team={team} />
      </div>
    </>
  );
}

function ContactsCard({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="relationship-card">
      <div className="relationship-card-head">
        <div className="relationship-card-label">Client contacts</div>
      </div>

      {contacts.length === 0 ? (
        <div style={{ padding: '12px 0', color: 'var(--text-soft)', fontSize: 14 }}>
          No contacts yet. Add the first person we work with here.
        </div>
      ) : (
        <div className="contacts-list">
          {contacts.map(c => (
            <div
              key={c.id}
              className="contact-row"
              data-contact-primary={c.primary ? 'true' : undefined}
            >
              <div className="contact-avatar" style={{ background: avatarColor(c.id) }}>
                {initialsOf(c.name)}
              </div>
              <div className="contact-body">
                <div className="contact-name">
                  {c.name}
                  {c.primary && (
                    <span
                      className="contact-primary-badge"
                      title="Primary contact — gets CC'd on Weekly WIP pings"
                      aria-label="Primary contact"
                      style={{
                        marginLeft: 8, color: '#ffb800',
                        display: 'inline-flex', verticalAlign: 'middle',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9" />
                      </svg>
                    </span>
                  )}
                </div>
                {c.role && <div className="contact-role">{c.role}</div>}
              </div>
              <div className="contact-actions">
                {c.email && (
                  <a
                    className="contact-icon-btn"
                    href={`mailto:${c.email}`}
                    title={c.email}
                    aria-label={`Email ${c.name} at ${c.email}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="M3 7l9 7 9-7" />
                    </svg>
                  </a>
                )}
                {c.phone && (
                  <a
                    className="contact-icon-btn"
                    href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}
                    title={c.phone}
                    aria-label={`Call ${c.name} at ${c.phone}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M22 16.92V21a1 1 0 0 1-1.1 1 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 3.2 4.1 1 1 0 0 1 4.2 3h4.08a1 1 0 0 1 1 .75 12.78 12.78 0 0 0 .7 2.81 1 1 0 0 1-.23 1.05L8.21 9.21a16 16 0 0 0 6 6l1.6-1.6a1 1 0 0 1 1-.23 12.78 12.78 0 0 0 2.82.7 1 1 0 0 1 .75 1z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickLinksCard({ links }: { links: QuickLink[] }) {
  return (
    <div className="relationship-card">
      <div className="relationship-card-head">
        <div className="relationship-card-label">Quick links</div>
      </div>

      {links.length === 0 ? (
        <div style={{ padding: '12px 0', color: 'var(--text-soft)', fontSize: 14 }}>
          No saved links yet. Pin the client's website, Drive, or design system.
        </div>
      ) : (
        <div className="quick-links-list">
          {links.map(l => (
            <a
              key={l.id}
              className="quick-link"
              href={l.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span className="quick-link-icon" aria-hidden="true">
                {renderLinkIcon(l.icon)}
              </span>
              <span>
                <span className="quick-link-label">{l.label}</span>
                <span className="quick-link-host">{hostOf(l.url)}</span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="14" height="14" style={{ color: 'var(--text-faint)' }}>
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamGrid({ am, team }: { am: Member | null; team: Member[] }) {
  return (
    <div className="team-section-grid">
      <div className="team-group">
        <div className="team-group-label">Account manager</div>
        <div className="team-group-row">
          {am ? (
            <MemberCard member={am} solid />
          ) : (
            <span style={{ color: 'var(--text-soft)', fontSize: 14 }}>
              None assigned yet.
            </span>
          )}
        </div>
      </div>

      <div className="team-group-divider" />

      <div className="team-group">
        <div className="team-group-label">Project team</div>
        <div className="team-group-row">
          {team.length === 0 ? (
            <span style={{ color: 'var(--text-soft)', fontSize: 14 }}>
              No operators attached yet.
            </span>
          ) : (
            team.map(m => <MemberCard key={m.id} member={m} />)
          )}
        </div>
      </div>
    </div>
  );
}

function MemberCard({ member, solid = false }: { member: Member; solid?: boolean }) {
  // AMs use a solid avatar fill; operators use a soft background with
  // coloured text. Mirrors the mockup's visual split between the two roles
  // so you can tell roles apart at a glance.
  const style = solid
    ? { background: member.color, color: '#fff' }
    : { background: member.bg ?? 'var(--bg-soft)', color: member.color };
  return (
    <div className="team-member-card" data-team-member>
      <span className="team-member-avatar" style={style}>{member.initials}</span>
      <div className="team-member-body">
        <div className="team-member-name">{member.name}</div>
        {member.role && <div className="team-member-role">{member.role}</div>}
      </div>
    </div>
  );
}

// ── About helpers ─────────────────────────────────────────────────────────

/** Deterministic pastel avatar tint from a stable id. Keeps each contact's
 *  swatch the same across re-renders without us having to store a colour. */
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 55% 55%)`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function hostOf(url: string): string {
  try { return new URL(url).host.replace(/^www\./, ''); }
  catch { return url; }
}

function renderLinkIcon(kind?: QuickLink['icon']): React.ReactNode {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  switch (kind) {
    case 'globe':
      return (
        <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
      );
    case 'drive':
      return (
        <svg {...props}><path d="M8 3l8 14M3 17l4-14M21 17l-4-14M3 17h18" /></svg>
      );
    case 'doc':
      return (
        <svg {...props}><path d="M6 3h9l5 5v13a0 0 0 0 1 0 0H6z" /><path d="M14 3v6h6M8 13h8M8 17h8" /></svg>
      );
    case 'figma':
      return (
        <svg {...props}><circle cx="12" cy="12" r="3" /><path d="M15 9h-6a3 3 0 1 1 0-6h6zM15 3h-3v6M9 21a3 3 0 1 1 0-6h3v3a3 3 0 0 1-3 3zM15 9h-3v6" /></svg>
      );
    case 'folder':
      return (
        <svg {...props}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
      );
    case 'link':
    default:
      return (
        <svg {...props}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>
      );
  }
}

// ── Tabs that haven't been ported yet ─────────────────────────────────────

type PlaceholderTab = Exclude<TabKey, 'overview' | 'onboarding' | 'about' | 'notes' | 'touchpoints'>;

function TabPlaceholder({ tab }: { tab: PlaceholderTab }) {
  const LABELS: Record<PlaceholderTab, string> = {
    stats: 'Stats hub',
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
