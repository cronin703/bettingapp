export const revalidate = 86400;

const edges = [
  { num: 'E1',  stars: 3, name: 'Back-to-Back / Fatigue',               dir: 'under', desc: 'Team playing 2nd game in 2 nights or 3rd in 4 nights. Suppresses pace, shooting %, and 2nd-half execution. Fires less often in 2026 (avg 1.6 B2Bs/team) but same magnitude.' },
  { num: 'E2',  stars: 3, name: 'Slow vs. Slow Pace',                   dir: 'under', desc: 'Both teams rank bottom-10 in possessions per 40 minutes. Fewer scoring opportunities regardless of personnel. Foundational under edge — everything stacks on top.' },
  { num: 'E3',  stars: 2, name: 'Elite Defense at Home',                 dir: 'under', desc: 'Top-5 DEF RTG team hosting. Weight extra for high-crowd venues (CT, LV, SEA, NY). Apply SOS filter through Week 6 — early-season defensive ratings are unreliable. Toronto gets no crowd modifier until data exists.' },
  { num: 'E4',  stars: 2, name: 'Referee Crew Tendencies',               dir: 'both',  desc: 'Foul-light crew → fewer stoppages, reduced FTA → under. Foul-heavy crew → elevated FTA and possession extensions → over. Check assignment ~24hrs pre-tip.' },
  { num: 'E5',  stars: 3, name: 'Early-Season Market Inefficiency',      dir: 'under', desc: 'Weeks 1–4 active, diminishing through Week 6, off the board by Week 6. Books overprice offseason upgrades; true pace profiles not yet established. Highest long-run ROI window for under.' },
  { num: 'E6',  stars: 3, name: 'Key Playmaker Out / Injury Clustering', dir: 'both',  desc: 'Ball-handler or top scorer out → under. Elite rim protector out → over. Check RotoWire 2hrs pre-tip. Standing 2026 triggers: Napheesa Collier (MIN) out until June; Brionna Jones (ATL) recovering.' },
  { num: 'E7',  stars: 3, name: 'Reverse Line Movement / Steam',         dir: 'under', desc: 'Public 60%+ on over but total is dropping → sharp under signal. Steam move (multiple books moving simultaneously) is an even stronger coordinated-capital signal.' },
  { num: 'E8',  stars: 2, name: 'Shooting Regression',                   dir: 'under', desc: 'Team FG% significantly above true talent baseline (Haslametrics ABS) → expect regression. Reverse: team below baseline vs. weak defense → over signal. Apply Edge 13 discount for Portland/Toronto.' },
  { num: 'E9',  stars: 2, name: 'Recent Scoring Trend',                  dir: 'both',  desc: '4+ of last 10 games below season average → active under trend. 4+ above → over signal. Always contextualize against opponent quality — cold streak vs. elite defense is noise.' },
  { num: 'E10', stars: 2, name: 'Travel & Time Zone Disadvantage',       dir: 'under', desc: 'Away team cross-country within 24hrs, or West Coast team at early Eastern tipoff. Degrades reaction time, shot mechanics, late-game execution. Stack with fatigue for maximum signal.' },
  { num: 'E11', stars: 2, name: 'Look-Ahead Spot',                       dir: 'under', desc: 'Under candidate has marquee game within 48hrs. NOT standalone — must stack with ≥1 structural edge. 2026 expanded national TV slate means this fires nearly every week.' },
  { num: 'E12', stars: 2, name: 'Commissioner\'s Cup Motivation',        dir: 'both',  desc: 'NEW 2026. Jun 1–17 window. Both teams Cup-alive with point differential as live tiebreaker → over (incentive to run up score). One/both Cup-eliminated + big game soon → under stack with E11.' },
  { num: 'E13', stars: 2, name: 'Expansion Team Discount',               dir: 'info',  desc: 'NEW 2026. Portland Fire + Toronto Tempo through ~Week 8. Apply 30% discount to their efficiency metrics in E2, E3, E8, and E9. Sample sizes too thin to trust face-value ratings.' },
];

const sizingRows = [
  { edges: '0',  size: 'Skip',      note: 'No bet — no edge present' },
  { edges: '1',  size: 'Skip',      note: 'Monitor only, do not bet' },
  { edges: '2',  size: '1–1.5%',    note: 'Soft play' },
  { edges: '3',  size: '1.5–2.5%',  note: 'Strong play' },
  { edges: '4+', size: '3%',        note: 'Max conviction — hard cap' },
];

const calendarFlags = [
  { date: 'Week 5–6',      note: 'E5 early-season edge expires' },
  { date: 'Jun 1–17',      note: 'Commissioner\'s Cup window — apply E12 every game' },
  { date: 'Jun 30',        note: 'Cup championship — look-ahead risk for both finalists' },
  { date: 'Jul 2',         note: 'Roster cut-down — lineup instability Jul 2–5' },
  { date: 'Jul 23–27',     note: 'All-Star break' },
  { date: 'Jul 28',        note: 'Return from All-Star — structural under lean first 1–2 games' },
  { date: 'Aug 2',         note: 'Trade deadline — watch 48hrs for lineup disruption' },
  { date: 'Aug 31–Sep 16', note: 'FIBA World Cup break — no games' },
  { date: 'Sep 17–20',     note: 'Return from FIBA — stack E1+E10 for teams back from Berlin' },
  { date: 'Sep 24',        note: 'Final day of regular season' },
];

function Stars({ n }: { n: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3].map(i => (
        <span key={i} style={{ fontSize: 10, color: i <= n ? 'var(--md-primary)' : 'var(--md-outline)' }}>★</span>
      ))}
    </div>
  );
}

function DirBadge({ d }: { d: string }) {
  if (d === 'under') return <span className="chip chip-under">Under</span>;
  if (d === 'over')  return <span className="chip chip-over">Over</span>;
  if (d === 'both')  return <span className="chip" style={{ background: 'color-mix(in srgb, var(--md-primary) 14%, transparent)', color: 'var(--md-primary)' }}>Both</span>;
  return <span className="chip chip-skip">Info</span>;
}

export default function ModelPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Header */}
      <div>
        <p className="type-label-sm" style={{ color: 'var(--md-primary)', marginBottom: 6 }}>
          Expert Bettor Framework · v5 · 2026 Season
        </p>
        <h1 className="type-headline-md" style={{ marginBottom: 8 }}>Model Specification</h1>
        <p className="type-body-md" style={{ color: 'var(--md-on-surface-variant)', maxWidth: 600 }}>
          13 structural edges. Minimum 2 aligned signals to place a bet. Bidirectional conflicts skip unless one side leads by 2+. E13 is a modifier, not a directional edge.
        </p>
      </div>

      {/* Edges */}
      <section>
        <h2 className="type-title-lg" style={{ marginBottom: 16 }}>The 13 Structural Edges</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {edges.map(e => (
            <div key={e.num} style={{
              background: 'var(--md-surface-container-low)', borderRadius: 12,
              padding: '16px 20px', display: 'grid',
              gridTemplateColumns: '52px 1fr auto',
              gap: 16, alignItems: 'start',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: 'monospace', fontSize: '.75rem', fontWeight: 700, color: 'var(--md-primary)' }}>{e.num}</span>
                <Stars n={e.stars} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span className="type-title-sm" style={{ color: 'var(--md-on-surface)' }}>{e.name}</span>
                  <DirBadge d={e.dir} />
                </div>
                <p className="type-body-sm" style={{ color: 'var(--md-on-surface-variant)', lineHeight: 1.6 }}>{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sizing */}
      <section>
        <h2 className="type-title-lg" style={{ marginBottom: 16 }}>Bet Sizing Guide</h2>
        <div style={{ background: 'var(--md-surface-container-low)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '80px 120px 1fr',
            padding: '10px 20px', borderBottom: '1px solid var(--md-outline-variant)',
            color: 'var(--md-on-surface-variant)',
            fontSize: '.6875rem', fontWeight: 500, letterSpacing: '.045em', textTransform: 'uppercase',
          }}>
            <span>Edges</span><span>Bankroll %</span><span>Note</span>
          </div>
          {sizingRows.map((r, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '80px 120px 1fr',
              padding: '14px 20px',
              borderBottom: i < sizingRows.length - 1 ? '1px solid var(--md-outline-variant)' : 'none',
              alignItems: 'center',
            }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--md-on-surface)' }}>{r.edges}</span>
              <span style={{ fontWeight: 600, color: r.size === 'Skip' ? 'var(--md-outline)' : 'var(--md-primary)' }}>{r.size}</span>
              <span className="type-body-sm" style={{ color: 'var(--md-on-surface-variant)' }}>{r.note}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Bankroll rules */}
      <section>
        <h2 className="type-title-lg" style={{ marginBottom: 16 }}>Bankroll Protection</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['Hard cap', '3% max per game — no exceptions'],
            ['Daily slate cap', '10% across all games in one day'],
            ['Session stop-loss', 'Stop at −6% on the day'],
            ['Weekly stop-loss', 'No bets after −15% on the week'],
            ['No chasing', 'Flat sizing only — never increase after a loss'],
            ['No live entries', 'Pre-game only — live markets are untrackable for CLV'],
          ].map(([rule, desc]) => (
            <div key={rule} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="type-label-sm" style={{ color: 'var(--md-on-surface-variant)' }}>{rule}</span>
              <span className="type-body-md">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Calendar flags */}
      <section>
        <h2 className="type-title-lg" style={{ marginBottom: 16 }}>2026 Season Calendar Flags</h2>
        <div style={{ background: 'var(--md-surface-container-low)', borderRadius: 12, overflow: 'hidden' }}>
          {calendarFlags.map((f, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '140px 1fr',
              padding: '12px 20px', alignItems: 'center',
              borderBottom: i < calendarFlags.length - 1 ? '1px solid var(--md-outline-variant)' : 'none',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: '.75rem', fontWeight: 600, color: 'var(--md-primary)' }}>{f.date}</span>
              <span className="type-body-sm" style={{ color: 'var(--md-on-surface-variant)' }}>{f.note}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
