import { getCLVLog } from '@/lib/db/queries';
import CLVChart from '@/components/CLVChart';
export const revalidate = 60;

export default async function CLVPage() {
  let data: Awaited<ReturnType<typeof getCLVLog>> = [];
  try { data = await getCLVLog(); } catch {}

  const totalBets = data.reduce((s, d) => s + d.bets_placed, 0);
  const totalWins = data.reduce((s, d) => s + d.wins, 0);
  const clvPts = data.filter(d => d.avg_clv !== null);
  const avgCLV = clvPts.length > 0
    ? (clvPts.reduce((s, d) => s + (d.avg_clv ?? 0), 0) / clvPts.length).toFixed(2)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <h1 className="type-headline-md" style={{ marginBottom: 6 }}>CLV Tracker</h1>
        <p className="type-body-md" style={{ color: 'var(--md-on-surface-variant)' }}>
          Closing Line Value — the only reliable proof of edge over a large sample.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total Bets',   value: String(totalBets) },
          { label: 'Win Rate',     value: totalBets > 0 ? `${((totalWins / totalBets) * 100).toFixed(1)}%` : '--' },
          { label: 'Avg CLV',      value: avgCLV ? `${Number(avgCLV) >= 0 ? '+' : ''}${avgCLV}` : '--' },
          { label: 'Days Tracked', value: String(data.length) },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <span className="stat-label">{s.label}</span>
            <span className="stat-value" style={{ color: s.label === 'Avg CLV' && avgCLV && Number(avgCLV) > 0 ? 'var(--md-win)' : 'var(--md-on-surface)' }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: 'var(--md-surface-container-low)', borderRadius: 16, padding: '24px' }}>
        <p className="type-label-sm" style={{ color: 'var(--md-on-surface-variant)', marginBottom: 16 }}>
          Average CLV Over Time
        </p>
        <CLVChart data={data.slice().reverse()} />
      </div>

      {/* Explanation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { title: 'What is CLV?',          body: 'Closing Line Value measures whether you beat the number that the market closes at. A positive CLV means you found value before the sharp money moved the line.' },
          { title: 'Why it matters',        body: 'Win/loss record is subject to variance over short samples. Consistent positive CLV over 50+ bets is the only reliable proof the system has a real edge.' },
          { title: 'Minimum sample',        body: 'Meaningful read starts at 50 bets. The ideal sample is 150+ bets for statistical significance. Anything under 50 is noise.' },
          { title: 'Negative CLV signal',   body: 'If CLV is negative over a large sample, the edge is leaking at the line-shopping or timing step — not necessarily the model itself.' },
        ].map(c => (
          <div key={c.title} className="card-low">
            <p className="type-title-sm" style={{ marginBottom: 6 }}>{c.title}</p>
            <p className="type-body-sm" style={{ color: 'var(--md-on-surface-variant)', lineHeight: 1.6 }}>{c.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
