type Props = {
  viewClass: string;
  title: string;
  summary?: string;
};

// Temporary placeholder used by pages that haven't been ported from the mockup
// yet. The viewClass lets the mockup's layout CSS (`.view-overview.active`,
// `.view-clients.active`, etc.) still participate so the shell lays out the
// page the same way once real content lands.
export function StubPage({ viewClass, title, summary }: Props) {
  return (
    <div className={`view ${viewClass} active`}>
      <main style={{ padding: '48px 32px', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ fontSize: 12, color: 'var(--text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
          Coming next
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 12px', color: 'var(--text)' }}>
          {title}
        </h1>
        {summary && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            {summary}
          </p>
        )}
      </main>
    </div>
  );
}
