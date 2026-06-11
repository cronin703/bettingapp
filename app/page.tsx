import { getTodaysPicks } from '@/lib/db/queries';
import { runMorning } from '@/lib/model/runner';
import { format } from 'date-fns';
import TodayTable from '@/components/TodayTable';
export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  let picks = await getTodaysPicks().catch(() => []);
  if (picks.length === 0) {
    try { await runMorning(); } catch {}
    picks = await getTodaysPicks().catch(() => []);
  }

  const bets = picks.filter((p: Record<string, unknown>) => p.direction !== 'skip');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p className="type-label-sm" style={{ color: 'var(--md-on-surface-variant)', marginBottom: 4 }}>
            {format(new Date(), 'EEEE, MMMM d yyyy')}
          </p>
          <h1 className="type-headline-md" style={{ color: 'var(--md-on-surface)' }}>Today's Picks</h1>
        </div>
        <p className="type-body-sm" style={{ color: 'var(--md-on-surface-variant)' }}>
          Updated {format(new Date(), 'h:mm a')}
        </p>
      </div>

      {/* Summary chips */}
      {picks.length > 0 && (
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="card" style={{ padding: '10px 20px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="type-label-sm" style={{ color: 'var(--md-on-surface-variant)' }}>Games</span>
            <span style={{ fontWeight: 600, color: 'var(--md-on-surface)' }}>{picks.length}</span>
          </div>
          <div className="card" style={{ padding: '10px 20px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="type-label-sm" style={{ color: 'var(--md-on-surface-variant)' }}>Bets</span>
            <span style={{ fontWeight: 600, color: 'var(--md-primary)' }}>{bets.length}</span>
          </div>
        </div>
      )}

      {/* Main content */}
      {picks.length === 0 ? (
        <div style={{
          background: 'var(--md-surface-container-low)', borderRadius: 16,
          padding: '64px 24px', textAlign: 'center',
          color: 'var(--md-on-surface-variant)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏀</div>
          <p className="type-title-md" style={{ marginBottom: 6 }}>No games scheduled today</p>
          <p className="type-body-md">The model runs automatically at 9 AM and 5 PM ET.</p>
        </div>
      ) : (
        <TodayTable picks={picks as never} />
      )}
    </div>
  );
}
