import { getAllResults } from '@/lib/db/queries';
import { format, parseISO } from 'date-fns';
export const revalidate = 60;

function DirectionChip({ d }: { d: string }) {
  const cls = d === 'over' ? 'chip chip-over' : d === 'under' ? 'chip chip-under' : 'chip chip-skip';
  return <span className={cls}>{d.toUpperCase()}</span>;
}

function ResultBadge({ r }: { r: string | null }) {
  if (!r) return <span style={{ color: 'var(--md-on-surface-variant)', fontStyle: 'italic', fontSize: '.8125rem' }}>Pending</span>;
  if (r === 'no_bet') return <span style={{ color: 'var(--md-on-surface-variant)', fontSize: '.8125rem' }}>No bet</span>;
  const color = r === 'win' ? 'var(--md-win)' : r === 'loss' ? 'var(--md-loss)' : 'var(--md-on-surface-variant)';
  return <span style={{ color, fontWeight: 600, fontSize: '.875rem' }}>{r.charAt(0).toUpperCase() + r.slice(1)}</span>;
}

export default async function ResultsPage() {
  let results: Awaited<ReturnType<typeof getAllResults>> = [];
  try { results = await getAllResults(); } catch {}

  const bets = results.filter(r => r.direction !== 'skip');
  const settled = bets.filter(r => r.result && r.result !== 'no_bet');
  const wins = settled.filter(r => r.result === 'win').length;
  const losses = settled.filter(r => r.result === 'loss').length;
  const winPct = settled.length > 0 ? ((wins / settled.length) * 100).toFixed(1) : null;
  const avgClv = settled.length > 0
    ? (settled.reduce((s, r) => s + (Number(r.clv) || 0), 0) / settled.length).toFixed(2)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <h1 className="type-headline-md">Results</h1>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Record',     value: `${wins}-${losses}` },
          { label: 'Win %',      value: winPct ? `${winPct}%` : '--' },
          { label: 'Avg CLV',    value: avgClv ? `${Number(avgClv) >= 0 ? '+' : ''}${avgClv}` : '--' },
          { label: 'Total Bets', value: String(bets.length) },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--md-surface-container-low)', borderRadius: 16, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr 90px 70px 90px 70px 90px 70px',
          padding: '12px 20px',
          borderBottom: '1px solid var(--md-outline-variant)',
          color: 'var(--md-on-surface-variant)',
          fontSize: '.6875rem', fontWeight: 500, letterSpacing: '.045em', textTransform: 'uppercase',
        }}>
          <span>Date</span>
          <span>Matchup</span>
          <span>Call</span>
          <span>Line</span>
          <span>Score</span>
          <span>Total</span>
          <span>Result</span>
          <span>CLV</span>
        </div>

        {results.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--md-on-surface-variant)' }}>
            <p className="type-body-md">No results yet. Run the model from the Admin page.</p>
          </div>
        )}

        {results.map((r, i) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr 90px 70px 90px 70px 90px 70px',
            padding: '14px 20px', alignItems: 'center',
            borderBottom: i < results.length - 1 ? '1px solid var(--md-outline-variant)' : 'none',
            transition: 'background .12s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--md-primary) 4%, transparent)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: '.8125rem', color: 'var(--md-on-surface-variant)' }}>
              {format(parseISO(String(r.date)), 'MMM d')}
            </span>
            <div>
              <span style={{ fontWeight: 500, fontSize: '.875rem' }}>{r.away_team}</span>
              <span style={{ color: 'var(--md-on-surface-variant)', fontSize: '.8125rem' }}> @ {r.home_team}</span>
            </div>
            <span><DirectionChip d={String(r.direction)} /></span>
            <span style={{ fontSize: '.875rem', color: 'var(--md-on-surface)' }}>{r.line ?? '--'}</span>
            <span style={{ fontSize: '.875rem', color: 'var(--md-on-surface-variant)' }}>
              {r.final_score_away != null ? `${r.final_score_away}-${r.final_score_home}` : '--'}
            </span>
            <span style={{ fontSize: '.875rem', fontWeight: 500, color: 'var(--md-on-surface)' }}>
              {r.total ?? '--'}
            </span>
            <ResultBadge r={r.result as string | null} />
            <span style={{ fontSize: '.875rem', color: r.clv != null && Number(r.clv) > 0 ? 'var(--md-win)' : 'var(--md-on-surface-variant)' }}>
              {r.clv != null ? `${Number(r.clv) > 0 ? '+' : ''}${r.clv}` : '--'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
