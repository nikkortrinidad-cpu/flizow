import { useMemo, useState } from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import type { Client } from '../types/flizow';

/**
 * Stats tab — the "is the work paying off" view.
 *
 * This tab is a *display port* of the mockup. In production the numbers come
 * from Google Ads / Meta / GA4 / Search Console / HubSpot via their APIs.
 * Here they come from a deterministic hash of the client id, so each client
 * shows a stable (but different) set of numbers across refreshes.
 *
 * The tab has four strips stacked vertically:
 *   1. Toolbar — live-sync dot, refresh button, 7d/30d/90d range selector.
 *   2. Hero KPIs — 4 roll-up cards (Ad Spend, Leads, Blended CPL, Email).
 *   3. Channels — 7 brand cards (Google Ads, Meta, LinkedIn, Pinterest,
 *      GA4, Search Console, HubSpot).
 *   4. Activity feed — what changed in the last 7 days.
 *
 * The range selector is purely local state today: flipping 7d/30d/90d
 * re-derives numbers from the same seed with a multiplier so the trend
 * direction stays consistent. Live-wiring to channel APIs is a later pass.
 */

interface Props {
  client: Client;
}

type Range = '7d' | '30d' | '90d';

export function StatsTab({ client }: Props) {
  const [range, setRange] = useState<Range>('30d');
  const [spinning, setSpinning] = useState(false);

  // Deterministic seed: same client always shows the same numbers, but
  // different clients show different numbers. Range factor lets the values
  // scale predictably across window changes.
  const seed = useMemo(() => hashSeed(client.id), [client.id]);
  const rangeFactor = range === '7d' ? 0.22 : range === '30d' ? 1 : 3.05;

  const kpis = useMemo(() => buildKpis(seed, rangeFactor), [seed, rangeFactor]);
  const channels = useMemo(() => buildChannels(seed, rangeFactor), [seed, rangeFactor]);
  const anomalies = useMemo(() => buildAnomalies(seed), [seed]);

  function handleRefresh() {
    // Animation only — the numbers come from a pure hash. Real sync will
    // kick a fetch and re-render on resolution.
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 650);
  }

  return (
    <div className="detail-section" data-section-id={`${client.id}-stats`} data-tab="stats">
      <div className="stats-hub" data-stats-range={range}>
        {/* ── Toolbar ── */}
        <div className="stats-toolbar">
          <div className="stats-toolbar-left">
            <div className="stats-sync">
              <span className="stats-sync-dot" aria-hidden="true" />
              <span className="stats-sync-label">Live</span>
              <span className="stats-sync-sep" aria-hidden="true" />
              <span className="stats-sync-meta">Synced {1 + (seed % 6)} min ago</span>
            </div>
            <button
              type="button"
              className={`stats-refresh${spinning ? ' spinning' : ''}`}
              onClick={handleRefresh}
              aria-label="Refresh data"
              title="Refresh all platforms"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
                <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
              </svg>
            </button>
          </div>
          <div className="stats-toolbar-right">
            <span className="stats-range-label">Range</span>
            <div className="stats-range" role="tablist" aria-label="Time range">
              {(['7d', '30d', '90d'] as Range[]).map(r => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={range === r}
                  data-active={range === r ? 'true' : undefined}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Hero KPIs ── */}
        <div>
          <SectionLabel heading={`Summary · ${channelsConnectedFor(seed)} channels`}>
            <span className="stats-section-link" style={{ cursor: 'default' }}>
              vs. prior {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
            </span>
          </SectionLabel>
          <div className="stats-hero-grid">
            {kpis.map(k => <HeroCard key={k.key} kpi={k} />)}
          </div>
        </div>

        {/* ── Channels ── */}
        <div>
          <SectionLabel heading={`Channels · ${channels.length} connected`}>
            <a
              href="#account/integrations"
              className="stats-section-link"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                // Integrations pane lives in Account Settings, which hasn't
                // been ported yet. Swallow the click so we don't send the
                // user to a broken anchor.
                e.preventDefault();
              }}
            >
              Manage integrations →
            </a>
          </SectionLabel>
          <div className="stats-channels-grid">
            {channels.map(ch => <ChannelCard key={ch.brand} channel={ch} />)}
          </div>
        </div>

        {/* ── Anomaly feed ── */}
        <div>
          <SectionLabel heading="What changed · Last 7 days">
            <a
              href="#anomalies"
              className="stats-section-link"
              onClick={(e) => { e.preventDefault(); }}
            >
              View all anomalies →
            </a>
          </SectionLabel>
          <div className="stats-activity">
            {anomalies.map(a => <AnomalyRow key={a.key} item={a} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────

function SectionLabel({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="stats-section-label">
      <span className="stats-section-heading">{heading}</span>
      {children}
    </div>
  );
}

function HeroCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="stats-hero-card" data-tone={kpi.key}>
      <span className="stats-hero-label">{kpi.label}</span>
      <div className="stats-hero-value-row">
        <span className="stats-hero-value">
          {kpi.value}
          {kpi.suffix && (
            <span style={{ fontSize: 'var(--fs-2xl)', opacity: 0.7 }}>{kpi.suffix}</span>
          )}
        </span>
        <DeltaChip delta={kpi.delta} goodIsUp={kpi.goodIsUp} />
      </div>
      <svg className="stats-hero-spark" viewBox="0 0 300 32" preserveAspectRatio="none">
        <path className="area" d={sparkAreaPath(kpi.spark, 32)} />
        <path className="line" d={sparkLinePath(kpi.spark, 32)} />
      </svg>
      <span className="stats-hero-foot">{kpi.foot}</span>
    </div>
  );
}

function ChannelCard({ channel }: { channel: Channel }) {
  return (
    <div className="stats-channel-card" data-brand={channel.brand}>
      <div className="stats-channel-top">
        <div className="stats-channel-brand">
          <span className="stats-channel-logo">
            {channel.logo}
          </span>
          <div className="stats-channel-name-wrap">
            <div className="stats-channel-name">{channel.name}</div>
            <div className="stats-channel-sub">{channel.sub}</div>
          </div>
        </div>
        <span className={`stats-channel-status ${channel.statusTone}`}>
          <span className="dot" />
          {channel.statusLabel}
        </span>
      </div>

      <div className="stats-channel-primary">
        <span className="stats-channel-primary-label">{channel.primaryLabel}</span>
        <div className="stats-channel-primary-row">
          <span className="stats-channel-primary-value">{channel.primaryValue}</span>
          <DeltaChip delta={channel.delta} goodIsUp={channel.goodIsUp} tag={channel.deltaTag} />
        </div>
      </div>

      <svg className="stats-channel-spark" viewBox="0 0 300 36" preserveAspectRatio="none">
        <path className="area" d={sparkAreaPath(channel.spark, 36)} />
        <path className="line" d={sparkLinePath(channel.spark, 36)} />
      </svg>

      <div className="stats-channel-secondary">
        {channel.secondary.map(s => (
          <div key={s.label} className="stats-channel-sec">
            <span className="stats-channel-sec-label">{s.label}</span>
            <span className="stats-channel-sec-value">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="stats-channel-foot">
        <a
          href="#"
          className="stats-channel-foot-link"
          onClick={(e) => e.preventDefault()}
          title={`Open in ${channel.name}`}
        >
          {channel.linkLabel}
          <ChevronRightIcon aria-hidden="true" />
        </a>
        <span className="stats-channel-foot-meta">Synced {channel.syncedMin} min ago</span>
      </div>
    </div>
  );
}

function AnomalyRow({ item }: { item: Anomaly }) {
  return (
    <div className="stats-activity-item">
      <span className={`stats-activity-icon ${item.tone}`}>
        {item.icon}
      </span>
      <div className="stats-activity-body">
        <div className="stats-activity-title">
          <strong>{item.source}:</strong> {item.title}
        </div>
        <div className="stats-activity-meta">
          <span>{item.source}</span>
          <span className="sep" />
          <span>{item.tag}</span>
        </div>
      </div>
      <span className="stats-activity-time">{item.time}</span>
    </div>
  );
}

function DeltaChip({ delta, goodIsUp, tag }: {
  delta: { value: string; direction: 'up' | 'down' | 'flat' };
  goodIsUp: boolean;
  tag?: string;
}) {
  // Green if direction matches "good", red otherwise. Flat is neutral.
  const good = delta.direction === 'flat'
    ? 'flat'
    : (delta.direction === 'up') === goodIsUp
      ? 'good'
      : 'bad';
  const cls = good === 'bad' ? 'stats-hero-delta bad' : good === 'flat' ? 'stats-hero-delta flat' : 'stats-hero-delta';
  const icon = delta.direction === 'flat'
    ? <line x1="5" y1="12" x2="19" y2="12" />
    : delta.direction === 'up'
      ? <polyline points="18 15 12 9 6 15" />
      : <polyline points="6 9 12 15 18 9" />;
  return (
    <span className={cls.replace('stats-hero-delta', 'stats-channel-delta')}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
      {tag ? tag : delta.value}
    </span>
  );
}

// ── Data builders ────────────────────────────────────────────────────────

interface Kpi {
  key: 'spend' | 'leads' | 'cpl' | 'email';
  label: string;
  value: string;
  suffix?: string;
  delta: Delta;
  goodIsUp: boolean;
  foot: string;
  spark: number[];
}

interface Channel {
  brand: BrandKey;
  name: string;
  sub: string;
  logo: React.ReactNode;
  statusTone: 'live' | 'warn' | 'off';
  statusLabel: string;
  primaryLabel: string;
  primaryValue: string;
  delta: Delta;
  deltaTag?: string;
  goodIsUp: boolean;
  spark: number[];
  secondary: { label: string; value: string }[];
  linkLabel: string;
  syncedMin: number;
}

interface Anomaly {
  key: string;
  tone: 'up' | 'down' | 'warn' | 'info';
  icon: React.ReactNode;
  source: string;
  title: string;
  tag: string;
  time: string;
}

interface Delta {
  value: string;
  direction: 'up' | 'down' | 'flat';
}

type BrandKey = 'google-ads' | 'meta' | 'linkedin' | 'pinterest' | 'ga4' | 'gsc' | 'hubspot';

function buildKpis(seed: number, factor: number): Kpi[] {
  const spend = Math.round((18000 + variance(seed, 12000)) * factor);
  const leads = Math.round((900 + variance(seed + 7, 700)) * factor);
  const cpl = +(spend / Math.max(leads, 1)).toFixed(2);
  const engagement = +(28 + (seed % 12)).toFixed(1);

  return [
    {
      key: 'spend',
      label: 'Ad Spend',
      value: formatCurrency(spend),
      delta: buildDelta(seed, 4, 12, 'up'),
      goodIsUp: true, // Growing spend tends to mean growing program — OK in this view.
      foot: 'Across 4 paid platforms',
      spark: sparkSeries(seed, 'up'),
    },
    {
      key: 'leads',
      label: 'Leads',
      value: formatNumber(leads),
      delta: buildDelta(seed + 3, 6, 18, 'up'),
      goodIsUp: true,
      foot: 'Paid + organic · deduped',
      spark: sparkSeries(seed + 3, 'up'),
    },
    {
      key: 'cpl',
      label: 'Blended CPL',
      value: '$' + cpl.toFixed(2),
      delta: buildDelta(seed + 5, 3, 10, 'down'),
      goodIsUp: false, // Falling CPL is the good outcome.
      foot: 'Lower is better',
      spark: sparkSeries(seed + 5, 'down'),
    },
    {
      key: 'email',
      label: 'Email Engagement',
      value: engagement.toFixed(1),
      suffix: '%',
      delta: buildDelta(seed + 8, 1, 4, 'up', 'pt'),
      goodIsUp: true,
      foot: 'Avg open rate · HubSpot',
      spark: sparkSeries(seed + 8, 'up'),
    },
  ];
}

function buildChannels(seed: number, factor: number): Channel[] {
  // Same 7 channels every time. Numbers vary per client so two clients feel
  // different, but the order and set is fixed so the page doesn't reshuffle.
  const out: Channel[] = [];

  const gaSpend = Math.round((5500 + variance(seed + 11, 3500)) * factor);
  out.push({
    brand: 'google-ads',
    name: 'Google Ads',
    sub: 'Search · Performance Max',
    logo: (
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path d="M12 2 L21 18 L3 18 Z" fill="#fbbc04" />
        <circle cx="7" cy="18" r="3.2" fill="#34a853" />
        <path d="M12 2 L3 18 L7 18 L16 2 Z" fill="#4285f4" opacity="0.82" />
      </svg>
    ),
    statusTone: 'live',
    statusLabel: 'Live',
    primaryLabel: `Spend · ${rangeFromFactor(factor)}`,
    primaryValue: formatCurrency(gaSpend),
    delta: buildDelta(seed + 12, 2, 9, 'down'),
    goodIsUp: false,
    spark: sparkSeries(seed + 12, 'down'),
    secondary: [
      { label: 'Leads', value: formatNumber(Math.round(gaSpend / 22)) },
      { label: 'CPL', value: '$' + (18 + (seed % 8)).toFixed(2) },
      { label: 'Impr. share', value: (58 + (seed % 18)) + '%' },
    ],
    linkLabel: 'Open in Google Ads',
    syncedMin: 1 + (seed % 5),
  });

  const metaSpend = Math.round((7800 + variance(seed + 17, 4200)) * factor);
  out.push({
    brand: 'meta',
    name: 'Meta Ads',
    sub: 'Facebook · Instagram',
    logo: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <path d="M4 16 C4 9, 8 5, 12 11 C16 17, 20 13, 20 8" stroke="#0866ff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
    statusTone: 'live',
    statusLabel: 'Live',
    primaryLabel: `Spend · ${rangeFromFactor(factor)}`,
    primaryValue: formatCurrency(metaSpend),
    delta: buildDelta(seed + 18, 8, 18, 'up'),
    goodIsUp: true,
    spark: sparkSeries(seed + 18, 'up'),
    secondary: [
      { label: 'Leads', value: formatNumber(Math.round(metaSpend / 19)) },
      { label: 'CPL', value: '$' + (16 + (seed % 9)).toFixed(2) },
      { label: 'Reach', value: (280 + (seed % 180)) + 'K' },
    ],
    linkLabel: 'Open in Ads Manager',
    syncedMin: 2 + (seed % 4),
  });

  const linkedinSpend = Math.round((3800 + variance(seed + 21, 2400)) * factor);
  out.push({
    brand: 'linkedin',
    name: 'LinkedIn Ads',
    sub: 'Sponsored content · Lead gen',
    logo: (
      <svg viewBox="0 0 24 24" width="20" height="20">
        <rect x="2" y="2" width="20" height="20" rx="4" fill="#0a66c2" />
        <rect x="5" y="9" width="3" height="10" fill="#fff" />
        <circle cx="6.5" cy="6" r="1.8" fill="#fff" />
        <path d="M10 9 H13 V10.5 C13.6,9.4 14.8,9 16,9 C18,9 19,10.5 19,13 V19 H16 V13.5 C16,12.3 15.5,11.6 14.4,11.6 C13.5,11.6 13,12.2 13,13.3 V19 H10 Z" fill="#fff" />
      </svg>
    ),
    statusTone: 'live',
    statusLabel: 'Live',
    primaryLabel: `Spend · ${rangeFromFactor(factor)}`,
    primaryValue: formatCurrency(linkedinSpend),
    delta: buildDelta(seed + 22, 4, 12, 'up'),
    goodIsUp: true,
    spark: sparkSeries(seed + 22, 'up'),
    secondary: [
      { label: 'Leads', value: formatNumber(Math.round(linkedinSpend / 34)) },
      { label: 'CPL', value: '$' + (32 + (seed % 10)).toFixed(2) },
      { label: 'CTR', value: (0.4 + ((seed % 5) / 10)).toFixed(2) + '%' },
    ],
    linkLabel: 'Open in Campaign Mgr',
    syncedMin: 3 + (seed % 4),
  });

  // Pinterest often shows attention-worthy pacing in the mockup — preserve
  // that shape so the anomaly list and the channel card tell the same story.
  const pinSpend = Math.round((2400 + variance(seed + 25, 1800)) * factor);
  const pinAttention = seed % 3 === 0;
  out.push({
    brand: 'pinterest',
    name: 'Pinterest Ads',
    sub: 'Standard · Shopping pins',
    logo: (
      <svg viewBox="0 0 24 24" width="20" height="20">
        <circle cx="12" cy="12" r="10" fill="#e60023" />
        <path d="M12 5.6 C8.7 5.6 6 7.9 6 10.9 C6 12.8 6.9 14.1 8.3 14.5 C8.4 13.9 8.4 13.6 8.5 13 C8.2 12.6 8 12.1 8 11.3 C8 9.5 9.5 7.9 11.6 7.9 C13.5 7.9 14.6 9 14.6 10.5 C14.6 12.5 13.7 14.3 12.3 14.3 C11.5 14.3 11 13.7 11.2 12.9 C11.4 12.1 11.8 11.2 11.8 10.6 C11.8 10 11.5 9.5 10.8 9.5 C10 9.5 9.4 10.3 9.4 11.4 C9.4 12.1 9.6 12.6 9.6 12.6 C9.6 12.6 8.8 15.8 8.6 16.4 C8.4 17.4 8.6 18.5 8.7 18.6 C8.8 18.7 8.9 18.7 9 18.6 C9.1 18.4 10.3 16.9 10.6 16 C10.7 15.7 11.1 14.1 11.1 14.1 C11.4 14.6 12.1 15 13 15 C15.3 15 16.9 12.9 16.9 10.1 C16.9 8 15.1 5.6 12 5.6 Z" fill="#fff" />
      </svg>
    ),
    statusTone: pinAttention ? 'warn' : 'live',
    statusLabel: pinAttention ? 'Attention' : 'Live',
    primaryLabel: `Spend · ${rangeFromFactor(factor)}`,
    primaryValue: formatCurrency(pinSpend),
    delta: pinAttention
      ? { value: 'CPL 31%', direction: 'up' }
      : buildDelta(seed + 26, 2, 8, 'up'),
    goodIsUp: false,
    deltaTag: pinAttention ? 'CPL 31%' : undefined,
    spark: sparkSeries(seed + 26, pinAttention ? 'down' : 'up'),
    secondary: [
      { label: 'Saves', value: formatNumber(6000 + (seed % 3000)) },
      { label: 'CPS', value: '$' + (0.3 + ((seed % 5) / 10)).toFixed(2) },
      { label: 'Impr.', value: (0.8 + ((seed % 9) / 10)).toFixed(1) + 'M' },
    ],
    linkLabel: 'Open in Ads Manager',
    syncedMin: 4 + (seed % 6),
  });

  out.push({
    brand: 'ga4',
    name: 'Google Analytics 4',
    sub: `${client(seed)}.com · Web`,
    logo: (
      <svg viewBox="0 0 24 24" width="20" height="20">
        <rect x="4" y="10" width="4" height="10" rx="1.4" fill="#f9ab00" />
        <rect x="10" y="6" width="4" height="14" rx="1.4" fill="#e37400" />
        <rect x="16" y="2" width="4" height="18" rx="1.4" fill="#4285f4" />
      </svg>
    ),
    statusTone: 'live',
    statusLabel: 'Live',
    primaryLabel: `Sessions · ${rangeFromFactor(factor)}`,
    primaryValue: formatShortThousands(Math.round((32000 + variance(seed + 33, 28000)) * factor)),
    delta: buildDelta(seed + 34, 6, 16, 'up'),
    goodIsUp: true,
    spark: sparkSeries(seed + 34, 'up'),
    secondary: [
      { label: 'Users', value: formatShortThousands(Math.round((24000 + variance(seed + 35, 18000)) * factor)) },
      { label: 'Conv.', value: (2.2 + ((seed % 14) / 10)).toFixed(1) + '%' },
      { label: 'Bounce', value: (38 + (seed % 10)).toFixed(1) + '%' },
    ],
    linkLabel: 'Open in Analytics',
    syncedMin: 1 + (seed % 3),
  });

  out.push({
    brand: 'gsc',
    name: 'Search Console',
    sub: 'Organic search · Google',
    logo: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#bf5af2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7.2" />
        <line x1="20.5" y1="20.5" x2="16.3" y2="16.3" />
      </svg>
    ),
    statusTone: 'live',
    statusLabel: 'Live',
    primaryLabel: `Clicks · ${rangeFromFactor(factor)}`,
    primaryValue: formatShortThousands(Math.round((14000 + variance(seed + 41, 14000)) * factor)),
    delta: buildDelta(seed + 42, 4, 13, 'up'),
    goodIsUp: true,
    spark: sparkSeries(seed + 42, 'up'),
    secondary: [
      { label: 'Impr.', value: formatShortThousands(Math.round((420000 + variance(seed + 43, 300000)) * factor)) },
      { label: 'Avg pos.', value: (10 + (seed % 9)).toFixed(1) },
      { label: 'CTR', value: (2.4 + ((seed % 14) / 10)).toFixed(2) + '%' },
    ],
    linkLabel: 'Open in Search Console',
    syncedMin: 5 + (seed % 10),
  });

  out.push({
    brand: 'hubspot',
    name: 'HubSpot',
    sub: 'Email · CRM',
    logo: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <path d="M18 8 V5.5 A1.5 1.5 0 1 0 16.5 4 H14 L14 7.6 A5 5 0 1 0 17.8 15.4 L20 17.6 L21.5 16 L19.4 14 A5 5 0 0 0 18 8 Z M14.2 15.4 A2.9 2.9 0 1 1 14.2 9.6 A2.9 2.9 0 0 1 14.2 15.4 Z" fill="#ff7a59" />
      </svg>
    ),
    statusTone: 'live',
    statusLabel: 'Live',
    primaryLabel: `Emails sent · ${rangeFromFactor(factor)}`,
    primaryValue: formatNumber(Math.round((110000 + variance(seed + 47, 40000)) * factor)),
    delta: buildDelta(seed + 48, 0, 2, 'flat'),
    goodIsUp: true,
    spark: sparkSeries(seed + 48, 'flat'),
    secondary: [
      { label: 'Open', value: (28 + (seed % 12)).toFixed(1) + '%' },
      { label: 'Click', value: (4.5 + ((seed % 7) / 10)).toFixed(1) + '%' },
      { label: 'Unsub.', value: (0.18 + ((seed % 6) / 100)).toFixed(2) + '%' },
    ],
    linkLabel: 'Open in HubSpot',
    syncedMin: 3 + (seed % 4),
  });

  return out;
}

function buildAnomalies(seed: number): Anomaly[] {
  // Five anomaly shapes — keep the list identical in shape across clients
  // so the user learns what each icon means fast, but pick different
  // copy based on the seed so clients don't feel like copies of each other.
  const upIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
  const downIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
      <polyline points="17 18 23 18 23 12" />
    </svg>
  );
  const warnIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
  const infoIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );

  const TEMPLATES: Omit<Anomaly, 'key'>[] = [
    {
      tone: 'warn', icon: warnIcon,
      source: 'Pinterest Ads',
      title: 'CPL up 31% vs last week — daily budget cap hit 5 days in a row',
      tag: 'Budget pacing', time: '2h ago',
    },
    {
      tone: 'up', icon: upIcon,
      source: 'Google Ads',
      title: 'New top keyword drove 24% of leads this week',
      tag: 'Keyword', time: 'Yesterday',
    },
    {
      tone: 'down', icon: downIcon,
      source: 'Meta Ads',
      title: `Impressions down ${12 + (seed % 12)}% on top creative — likely fatigue`,
      tag: 'Creative', time: '2d ago',
    },
    {
      tone: 'up', icon: upIcon,
      source: 'GA4',
      title: `/pricing bounce rate improved ${4 + (seed % 8)}pt after last week's copy update`,
      tag: 'Landing page', time: '3d ago',
    },
    {
      tone: 'info', icon: infoIcon,
      source: 'HubSpot',
      title: `April newsletter reached ${(1.5 + ((seed % 20) / 10)).toFixed(1)}× the click rate of March's — top performer`,
      tag: 'Email campaign', time: 'Apr 14',
    },
  ];

  return TEMPLATES.map((t, i) => ({ ...t, key: `anom-${i}` }));
}

// ── Helpers ──────────────────────────────────────────────────────────────

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 10000;
}

/** Pull a deterministic value in [0, max] from the seed. */
function variance(seed: number, max: number): number {
  return (seed * 9301 + 49297) % (max + 1);
}

function buildDelta(seed: number, min: number, max: number, bias: 'up' | 'down' | 'flat', unit = '%'): Delta {
  if (bias === 'flat') {
    const v = +((seed % 10) / 10).toFixed(1);
    return { value: v.toFixed(1) + unit, direction: 'flat' };
  }
  const range = max - min;
  const v = min + (variance(seed, range * 10) / 10);
  return { value: v.toFixed(1) + unit, direction: bias };
}

/** Build a 13-point sparkline series with a given trend bias. Values are
 *  0 = top of chart, 32 = bottom (SVG coords inverted). */
function sparkSeries(seed: number, bias: 'up' | 'down' | 'flat'): number[] {
  const N = 13;
  const out: number[] = [];
  for (let i = 0; i < N; i++) {
    const base = bias === 'up' ? 28 - (i * 1.8) : bias === 'down' ? 6 + (i * 1.6) : 16;
    const wiggle = ((seed + i * 7) % 9) - 4; // −4 … +4
    out.push(clamp(base + wiggle, 2, 30));
  }
  return out;
}

function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n;
}

/** Render a polyline path from a value series, 300 wide × `h` tall. */
function sparkLinePath(series: number[], h: number): string {
  const N = series.length;
  const step = 300 / (N - 1);
  return series
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(0)},${scaleY(v, 32, h).toFixed(0)}`)
    .join(' ');
}

function sparkAreaPath(series: number[], h: number): string {
  return `${sparkLinePath(series, h)} L300,${h} L0,${h} Z`;
}

function scaleY(v: number, srcMax: number, dstMax: number): number {
  return (v / srcMax) * dstMax;
}

function rangeFromFactor(factor: number): string {
  if (factor < 0.5) return '7d';
  if (factor < 2) return '30d';
  return '90d';
}

function channelsConnectedFor(_seed: number): string {
  // Today every client shows the same 7 integrations. Returning the label
  // as a helper leaves room to vary this once real integrations per client
  // are tracked in the store.
  return 'All';
}

function client(seed: number): string {
  const POOL = ['acme', 'northbeam', 'helios', 'voltline', 'meridian', 'orbit', 'luminaa', 'pinpoint', 'bravado', 'stoic'];
  return POOL[seed % POOL.length];
}

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatShortThousands(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}
