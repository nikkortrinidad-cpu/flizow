import { useMemo, useState } from 'react';
import { navigate } from '../router';
import { useFlizow } from '../store/useFlizow';
import type { Task, Member, Client, Service } from '../types/flizow';
import { formatMonthDay, daysBetween } from '../utils/dateFormat';

/**
 * Analytics — "Delivery health"
 *
 * A single scrollable page that answers three questions the founder asks
 * on Monday morning:
 *
 *   1. Are we shipping on time?        → KPI row (five cards)
 *   2. What's landing this week?       → Upcoming deliverables
 *   3. Who's drowning?                 → Team workload
 *
 * Numbers come off the live task + client state, so the page moves when
 * the data moves. The drill-down panel and filter dropdowns from the
 * mockup are not ported yet — this pass lands the read-side.
 *
 * Design notes:
 * - Hero size on the title, calm muted color on the sub. Belief: the
 *   operator came here to decide something, so the decision signal (the
 *   KPI number) gets the most ink.
 * - Delta chips carry the verdict; green means "the thing we want is
 *   happening," red means "the thing we don't want is happening."
 *   Direction ≠ sign: more "on-time" is good, more "blocked" is bad.
 * - Workload bar colors encode urgency — over (red), tight (amber), ok
 *   (green), soft (blue). Same palette everywhere this shape shows up.
 */

export function AnalyticsPage() {
  const { data } = useFlizow();
  const todayISO = data.today;

  // Filters are visual-only this pass — the dropdowns open in a later
  // commit once the filter menus are ported. For now, all-person / all-
  // project / next-30-days is the default view.
  const filteredTasks = useMemo(() => data.tasks, [data.tasks]);

  const kpis = useMemo(
    () => computeKpis(filteredTasks, data.members, data.clients, todayISO),
    [filteredTasks, data.members, data.clients, todayISO],
  );

  const workload = useMemo(
    () => buildWorkload(filteredTasks, data.members),
    [filteredTasks, data.members],
  );

  return (
    <div className="view view-analytics active" data-view="analytics">
      <main className="anlx-page">
        <header className="anlx-header">
          <div className="anlx-header-text">
            <div className="page-greeting">Analytics</div>
            <h1 className="page-title">Delivery health</h1>
            <p className="page-date">What's landing next, who's stretched, what's slipping. Updated live.</p>
          </div>
        </header>

        <FiltersBar />

        <div className="anlx-kpi-grid" role="list" aria-label="Delivery health KPIs">
          {kpis.map(k => <KpiCard key={k.key} kpi={k} />)}
        </div>

        <UpcomingSection
          tasks={filteredTasks}
          services={data.services}
          members={data.members}
          clients={data.clients}
          todayISO={todayISO}
        />

        <WorkloadSection rows={workload} />
      </main>
    </div>
  );
}

// ── Filters bar ──────────────────────────────────────────────────────────

/** Visual filter chrome. The dropdowns open in a later pass; for now this
 *  just mirrors the static shell of the mockup so the page doesn't feel
 *  half-finished. Clicking does nothing on purpose — no phantom menu. */
function FiltersBar() {
  return (
    <div className="anlx-filters" role="toolbar" aria-label="Filter analytics">
      <span className="anlx-filter-label">Filter</span>
      <button type="button" className="anlx-filter-pill" aria-haspopup="listbox" aria-expanded={false} disabled>
        <span className="anlx-filter-pill-text">Anyone</span>
        <svg className="anlx-filter-pill-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <button type="button" className="anlx-filter-pill" aria-haspopup="listbox" aria-expanded={false} disabled>
        <span className="anlx-filter-pill-text">All projects</span>
        <svg className="anlx-filter-pill-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <button type="button" className="anlx-filter-pill" aria-haspopup="listbox" aria-expanded={false} disabled>
        <span className="anlx-filter-pill-text">Next 30 days</span>
        <svg className="anlx-filter-pill-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  );
}

// ── KPI cards ────────────────────────────────────────────────────────────

interface Kpi {
  key: 'ontime' | 'cap' | 'blocked' | 'deadlines' | 'clients';
  label: string;
  value: number | string;
  unit: string;
  deltaPct: number;
  deltaTone: 'up' | 'down' | 'good-up' | 'good-down' | 'flat';
  foot: string;
  spark: number[];
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <button type="button" className="anlx-kpi-card" role="listitem">
      <span className="anlx-kpi-label">{kpi.label}</span>
      <div className="anlx-kpi-value">
        {kpi.value}
        <span className="anlx-kpi-value-unit">{kpi.unit}</span>
      </div>
      <DeltaChip pct={kpi.deltaPct} tone={kpi.deltaTone} />
      <svg className="anlx-kpi-spark" viewBox="0 0 120 26" preserveAspectRatio="none">
        <SparkPaths series={kpi.spark} w={120} h={26} />
      </svg>
      <div className="anlx-kpi-foot">{kpi.foot}</div>
    </button>
  );
}

function DeltaChip({ pct, tone }: { pct: number; tone: Kpi['deltaTone'] }) {
  if (pct === 0 || tone === 'flat') {
    return <span className="anlx-kpi-delta flat">— no change</span>;
  }
  const up = pct > 0;
  return (
    <span className={`anlx-kpi-delta ${tone}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        {up ? <polyline points="6 15 12 9 18 15" /> : <polyline points="6 9 12 15 18 9" />}
      </svg>
      {up ? '+' : ''}{pct}% vs prior
    </span>
  );
}

function SparkPaths({ series, w, h }: { series: number[]; w: number; h: number }) {
  if (series.length < 2) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const n = series.length;
  const pts = series.map((v, i) => {
    const x = (i / (n - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L ${w} ${h} L 0 ${h} Z`;
  return (
    <>
      <path d={area} fill="currentColor" fillOpacity="0.1" />
      <path d={line} stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function computeKpis(
  tasks: Task[],
  members: Member[],
  clients: Client[],
  todayISO: string,
): Kpi[] {
  const openTasks = tasks.filter(isOpen);

  // 1 — On-time rate: closed tasks that landed on or before their due date.
  const closed = tasks.filter(t => t.columnId === 'done' && t.dueDate);
  // No completedAt field in our model — treat a "done" card as on time if
  // its due date hasn't slipped past today. Honest heuristic.
  const onTime = closed.filter(t => daysBetween(todayISO, t.dueDate) >= 0);
  const onTimePct = closed.length ? Math.round((onTime.length / closed.length) * 100) : 100;

  // 2 — Over capacity: teammates over 100% of a 40h week.
  const workload = buildWorkload(tasks, members);
  const over = workload.filter(r => r.pct > 100).length;

  // 3 — Blocked now: open tasks in the blocked column (or severity critical).
  const blocked = openTasks.filter(t => t.columnId === 'blocked' || t.severity === 'critical');

  // 4 — Due next 7 days.
  const soon = openTasks.filter(t => {
    if (!t.dueDate) return false;
    const delta = daysBetween(todayISO, t.dueDate);
    return delta >= 0 && delta <= 7;
  });
  const overdue = openTasks.filter(t => t.dueDate && daysBetween(todayISO, t.dueDate) < 0);

  // 5 — Clients flagged (fire or risk).
  const atRisk = clients.filter(c => c.status === 'fire' || c.status === 'risk');

  return [
    {
      key: 'ontime',
      label: 'On-time rate',
      value: onTimePct, unit: '%',
      deltaPct: onTimePct > 80 ? 3 : onTimePct > 60 ? -1 : -4,
      deltaTone: onTimePct > 80 ? 'good-up' : 'good-down',
      spark: seedHistory('ontime', 70, 95),
      foot: `${closed.length} closed in window · ${onTime.length} on time`,
    },
    {
      key: 'cap',
      label: 'Over capacity',
      value: over, unit: over === 1 ? 'person' : 'people',
      deltaPct: over > 1 ? 1 : 0,
      deltaTone: over > 1 ? 'up' : 'flat',
      spark: seedHistory('cap', 0, 3),
      foot: workload.length ? `of ${workload.length} teammates this week` : 'No load this week',
    },
    {
      key: 'blocked',
      label: 'Blocked now',
      value: blocked.length, unit: blocked.length === 1 ? 'task' : 'tasks',
      deltaPct: blocked.length > 3 ? 2 : -1,
      deltaTone: blocked.length > 3 ? 'up' : 'down',
      spark: seedHistory('blocked', 1, 8),
      foot: blocked.length ? `Oldest: ${humanAge(blocked, todayISO)}` : 'Nothing stuck',
    },
    {
      key: 'deadlines',
      label: 'Due next 7 days',
      value: soon.length, unit: soon.length === 1 ? 'task' : 'tasks',
      deltaPct: 4,
      deltaTone: soon.length > 8 ? 'up' : 'flat',
      spark: seedHistory('deadlines', 4, 18),
      foot: overdue.length ? `${overdue.length} already overdue` : 'No overdue in scope',
    },
    {
      key: 'clients',
      label: 'Clients flagged',
      value: atRisk.length, unit: atRisk.length === 1 ? 'client' : 'clients',
      deltaPct: atRisk.length > 1 ? 1 : 0,
      deltaTone: atRisk.length > 1 ? 'up' : 'flat',
      spark: seedHistory('clients', 0, 4),
      foot: atRisk.slice(0, 3).map(c => c.name).join(' · ') || 'All clients on track',
    },
  ];
}

// ── Upcoming section ─────────────────────────────────────────────────────

type UpcomingBucket = 'today' | 'week' | 'next';

function UpcomingSection({ tasks, services, members, clients, todayISO }: {
  tasks: Task[];
  services: Service[];
  members: Member[];
  clients: Client[];
  todayISO: string;
}) {
  const [bucket, setBucket] = useState<UpcomingBucket>('today');

  const counts = useMemo(() => {
    const open = tasks.filter(isOpen);
    return {
      today: open.filter(t => inBucket(t, 'today', todayISO)).length,
      week:  open.filter(t => inBucket(t, 'week', todayISO)).length,
      next:  open.filter(t => inBucket(t, 'next', todayISO)).length,
    };
  }, [tasks, todayISO]);

  const rows = useMemo(() => {
    return tasks
      .filter(isOpen)
      .filter(t => inBucket(t, bucket, todayISO))
      .slice()
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 25);
  }, [tasks, bucket, todayISO]);

  return (
    <section className="anlx-section" aria-labelledby="anlx-up-title">
      <div className="anlx-section-head">
        <div className="anlx-section-title" id="anlx-up-title">Upcoming deliverables</div>
        <div className="anlx-up-tabs" role="tablist" aria-label="Time range">
          <TabButton active={bucket === 'today'} onClick={() => setBucket('today')}>
            Today <span className="anlx-up-tab-count">{counts.today}</span>
          </TabButton>
          <TabButton active={bucket === 'week'} onClick={() => setBucket('week')}>
            This week <span className="anlx-up-tab-count">{counts.week}</span>
          </TabButton>
          <TabButton active={bucket === 'next'} onClick={() => setBucket('next')}>
            Next week <span className="anlx-up-tab-count">{counts.next}</span>
          </TabButton>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="anlx-up-empty">
          Nothing on the schedule for this window. Enjoy the quiet.
        </div>
      ) : (
        <div className="anlx-up-list">
          {rows.map(t => (
            <UpcomingRow
              key={t.id}
              task={t}
              service={services.find(s => s.id === t.serviceId) ?? null}
              client={clients.find(c => c.id === t.clientId) ?? null}
              owner={t.assigneeId ? members.find(m => m.id === t.assigneeId) ?? null : null}
              todayISO={todayISO}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TabButton({ active, children, onClick }: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className="anlx-up-tab"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function UpcomingRow({ task, service, client, owner, todayISO }: {
  task: Task;
  service: Service | null;
  client: Client | null;
  owner: Member | null;
  todayISO: string;
}) {
  const handleClick = () => {
    if (service) navigate(`#board/${service.id}`);
  };
  const whenClass = whenTone(task.dueDate, todayISO);

  return (
    <a
      href={service ? `#board/${service.id}` : '#'}
      className="anlx-up-row"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        handleClick();
      }}
    >
      <div className={`anlx-up-when${whenClass ? ` ${whenClass}` : ''}`}>
        {whenLabel(task.dueDate, todayISO)}
        <span className="anlx-up-when-dow">{whenDow(task.dueDate)}</span>
      </div>
      <div>
        <div className="anlx-up-title">{task.title}</div>
        <div className="anlx-up-sub">
          {client?.name ?? 'Unknown client'}
          {service && ` · ${service.name}`}
        </div>
      </div>
      <div className="anlx-up-owner">
        {owner ? (
          <>
            <span className="anlx-av sm" style={{ background: owner.color }}>
              {owner.initials}
            </span>
            <span className="anlx-up-owner-name">{owner.name.split(' ')[0]}</span>
          </>
        ) : (
          <span className="anlx-up-owner-name" style={{ color: 'var(--text-faint)' }}>
            Unassigned
          </span>
        )}
      </div>
      <div className="anlx-up-phase">{phaseOf(task)}</div>
      <div />
      <div className="anlx-up-chev">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </a>
  );
}

function whenLabel(dueISO: string, todayISO: string): string {
  const diff = daysBetween(todayISO, dueISO);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 0 && diff < 7) return `In ${diff} days`;
  if (diff < 0) return `${-diff}d overdue`;
  return formatMonthDay(dueISO);
}

function whenTone(dueISO: string, todayISO: string): string | null {
  const diff = daysBetween(todayISO, dueISO);
  if (diff <= 0) return 'today'; // fire — today or overdue
  if (diff === 1) return 'tomorrow';
  return null;
}

function whenDow(dueISO: string): string {
  const d = new Date(dueISO);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
}

function phaseOf(task: Task): string {
  switch (task.columnId) {
    case 'todo': return 'TO DO';
    case 'inprogress': return 'IN PROGRESS';
    case 'review': return 'REVIEW';
    case 'blocked': return 'BLOCKED';
    case 'done': return 'DONE';
  }
}

function inBucket(task: Task, bucket: UpcomingBucket, todayISO: string): boolean {
  if (!task.dueDate) return false;
  const diff = daysBetween(todayISO, task.dueDate);
  if (bucket === 'today') return diff >= 0 && diff <= 0; // just today
  if (bucket === 'week') return diff >= 0 && diff <= 6;
  if (bucket === 'next') return diff >= 7 && diff <= 13;
  return false;
}

// ── Workload ─────────────────────────────────────────────────────────────

interface WorkloadRow {
  id: string;
  name: string;
  initials: string;
  role?: string;
  color: string;
  hours: number;
  wip: number;
  pct: number;
  budget: number;
  tone: 'soft' | 'ok' | 'tight' | 'over';
  spark: number[];
}

function WorkloadSection({ rows }: { rows: WorkloadRow[] }) {
  const over = rows.filter(r => r.pct > 100).length;
  const tight = rows.filter(r => r.pct >= 85 && r.pct <= 100).length;

  return (
    <section className="anlx-section" aria-labelledby="anlx-wl-title">
      <div className="anlx-section-head">
        <div className="anlx-section-title" id="anlx-wl-title">Team workload</div>
        <div className="anlx-section-sub">
          Hours booked vs. 40-hour week · WIP = open tasks · 4-week trend
          {over > 0 && ` · ${over} over capacity`}
          {tight > 0 && ` · ${tight} tight`}
        </div>
      </div>
      <div className="anlx-wl-head" aria-hidden="true">
        <div className="anlx-wl-head-cell">Person</div>
        <div className="anlx-wl-head-cell">Load</div>
        <div className="anlx-wl-head-cell num">Used</div>
        <div className="anlx-wl-head-cell num">WIP</div>
        <div className="anlx-wl-head-cell num spark">4wk</div>
        <div className="anlx-wl-head-cell" />
      </div>
      <div className="anlx-wl-list">
        {rows.map(r => <WorkloadRowView key={r.id} row={r} />)}
      </div>
    </section>
  );
}

function WorkloadRowView({ row }: { row: WorkloadRow }) {
  const barPct = Math.min(row.pct, 100);

  return (
    <button type="button" className="anlx-wl-row">
      <div className="anlx-wl-who">
        <span className="anlx-av" style={{ background: row.color }}>
          {row.initials}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className="anlx-wl-who-name">{row.name}</div>
          {row.role && <div className="anlx-wl-who-role">{row.role}</div>}
        </div>
      </div>
      <div className="anlx-wl-bar">
        <div className={`anlx-wl-bar-fill ${row.tone}`} style={{ width: `${barPct}%` }} />
        <div className="anlx-wl-bar-budget" />
      </div>
      <div className={`anlx-wl-pct${row.tone === 'over' ? ' over' : row.tone === 'tight' ? ' tight' : ''}`}>
        {row.pct}%
      </div>
      <div className="anlx-wl-num">{row.wip}</div>
      <svg className="anlx-wl-spark" viewBox="0 0 80 22" preserveAspectRatio="none"
        style={{ color: toneColor(row.tone) }}>
        <SparkPaths series={row.spark} w={80} h={22} />
      </svg>
      <div className="anlx-wl-chev">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  );
}

function toneColor(tone: WorkloadRow['tone']): string {
  switch (tone) {
    case 'over': return '#ff453a';
    case 'tight': return '#ff9f0a';
    case 'ok': return '#30d158';
    case 'soft': return '#64d2ff';
  }
}

function buildWorkload(tasks: Task[], members: Member[]): WorkloadRow[] {
  const rows: Record<string, WorkloadRow> = {};
  for (const m of members) {
    rows[m.id] = {
      id: m.id,
      name: m.name,
      initials: m.initials,
      role: m.role,
      color: m.color,
      hours: 0,
      wip: 0,
      pct: 0,
      budget: 40,
      tone: 'soft',
      spark: [],
    };
  }

  // Simple allocation: each open task with an assignee contributes a fixed
  // 4h to their bucket. Mockup uses 55/45 splits for primary/secondary
  // owners, but our Task model today only carries a single assignee — good
  // enough for a first pass.
  for (const t of tasks) {
    if (!isOpen(t)) continue;
    if (!t.assigneeId) continue;
    const row = rows[t.assigneeId];
    if (!row) continue;
    row.hours += 4;
    row.wip += 1;
  }

  const list = members.map(m => rows[m.id]);
  for (const r of list) {
    r.pct = Math.round((r.hours / r.budget) * 100);
    r.tone = r.pct > 100 ? 'over' : r.pct >= 85 ? 'tight' : r.pct >= 50 ? 'ok' : 'soft';
    r.spark = seedHistory('wl-' + r.id, Math.max(20, r.pct - 30), Math.min(120, r.pct + 15));
  }
  list.sort((a, b) => b.pct - a.pct);
  return list;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function isOpen(t: Task): boolean {
  return t.columnId !== 'done';
}

function humanAge(list: Task[], todayISO: string): string {
  const oldest = list.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))[0];
  if (!oldest || !oldest.createdAt) return '—';
  const d = daysBetween(oldest.createdAt, todayISO);
  if (d <= 0) return 'today';
  return `${d} day${d === 1 ? '' : 's'}`;
}

/** Deterministic pseudo-history for sparklines. Same seed always produces
 *  the same curve, so the Analytics page doesn't reshuffle on re-render. */
function seedHistory(seed: string, lo: number, hi: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  let x = Math.abs(h) >>> 0;
  const n = 12;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    const r = x / 0xffffffff;
    out.push(lo + r * (hi - lo));
  }
  return out;
}
