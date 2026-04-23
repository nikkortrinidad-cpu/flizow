import { useRoute } from '../router';
import { useFlizow } from '../store/useFlizow';

/**
 * Right-hand pane of the Clients split view.
 *
 *  - No id in the route  → empty prompt ("Select a client to view details").
 *  - Id present          → placeholder with the client header and a short
 *                          "what's coming" note. Full six-tab workspace
 *                          (Overview · Onboarding · About · Stats ·
 *                          Touchpoints · Notes) lands in the next pass.
 *
 * Rendered by `ClientsSplit` — don't use this on its own, it relies on
 * the `.clients-split-wrapper` layout that the split shell provides.
 */
export function ClientDetailPage() {
  const route = useRoute();
  const { data } = useFlizow();
  const id = route.params.id ?? null;
  const client = id ? data.clients.find(c => c.id === id) : null;

  return (
    <div className="view view-client-detail active" data-view="client-detail">
      {client ? <DetailStub clientId={client.id} /> : <EmptyState />}
    </div>
  );
}

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

function DetailStub({ clientId }: { clientId: string }) {
  const { data } = useFlizow();
  const client = data.clients.find(c => c.id === clientId);
  if (!client) return <EmptyState />;

  const services = data.services.filter(s => s.clientId === clientId);
  const openTasks = data.tasks.filter(t => t.clientId === clientId && t.columnId !== 'done').length;
  const am = client.amId ? data.members.find(m => m.id === client.amId) : null;

  return (
    <main className="client-detail-page" style={{ padding: '28px 36px 80px', maxWidth: 920, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div
          className={`client-logo ${client.logoClass}`}
          style={{ width: 56, height: 56, borderRadius: 12, fontSize: 18 }}
        >
          {client.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            {client.name}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 2 }}>
            {client.industry}
          </div>
        </div>
        <span className={`status-chip status-${client.status}`} style={{ flexShrink: 0 }}>
          {client.status}
        </span>
      </div>

      {/* Quick-look summary — intentionally minimal. Full tabbed workspace
          lands in the next pass; leaving a breadcrumb so this screen still
          answers "did I land on the right client?" at a glance. */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <Stat label="Services" value={String(services.length)} />
        <Stat label="Open tasks" value={String(openTasks)} />
        <Stat label="Account manager" value={am?.name ?? '—'} />
      </section>

      <div style={{
        padding: 16, borderRadius: 12,
        border: '1px dashed var(--hairline)',
        fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6,
      }}>
        Six-tab workspace (Overview · Onboarding · About · Stats · Touchpoints · Notes) lands in the next pass.
        Everything shown here is already live in the store — the full page just needs wiring.
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '12px 14px', border: '1px solid var(--hairline-soft)',
      borderRadius: 10, background: 'var(--bg-elev)',
    }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-soft)' }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}
