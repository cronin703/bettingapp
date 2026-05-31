import type { GameInput, ModelOutput, InjuryReport, ScheduleContext } from '@/lib/types';

const WNBA_AVG_TOTAL = 167; // 2024-25 season league average combined points

// Teams known for high-pace offense (lean over when involved)
const HIGH_PACE = ['Las Vegas Aces','New York Liberty','Seattle Storm','Chicago Sky','Golden State Valkyries','Atlanta Dream','Dallas Wings'];
// Teams known for defensive identity (lean under when involved)
const LOW_PACE  = ['Indiana Fever','Connecticut Sun','Minnesota Lynx','Washington Mystics','Phoenix Mercury'];

const edge = (over: boolean, under: boolean) => ({ over, under });

const edges = {
  backToBack: (s: ScheduleContext) => edge(false, s.home_back_to_back || s.away_back_to_back),
  travelFatigue: (s: ScheduleContext) => edge(false, s.away_travel && s.away_days_rest <= 1),
  injury: (inj: InjuryReport[]) => edge(false, inj.some(i => i.impact_level === 'high' && i.status === 'out')),
  paceMismatch: (d: number | null) => d === null ? edge(false,false) : edge(d > 5, d < -5),
  lineMovement: (o: number|null, c: number|null) => (!o||!c) ? edge(false,false) : edge(c-o < -1.5, c-o > 1.5),
  restAsymmetry: (s: ScheduleContext) => {
    const diff = Math.abs(s.home_days_rest - s.away_days_rest);
    return edge(false, diff >= 2 && (s.home_days_rest > s.away_days_rest+1 || s.away_days_rest > s.home_days_rest+1));
  },
  // Both teams high-pace → over; both defensive → under; mixed → neutral
  venueEffect: (home: string, away: string) => {
    const homeHigh = HIGH_PACE.includes(home), awayHigh = HIGH_PACE.includes(away);
    const homeLow  = LOW_PACE.includes(home),  awayLow  = LOW_PACE.includes(away);
    return edge(homeHigh && awayHigh, homeLow && awayLow);
  },
  // One team strongly high-pace vs one strongly defensive → line uncertainty
  defensiveMatchup: (home: string, away: string, total: number|null) => {
    const highCount = [home,away].filter(t => HIGH_PACE.includes(t)).length;
    const lowCount  = [home,away].filter(t => LOW_PACE.includes(t)).length;
    if (total !== null) return edge(total > WNBA_AVG_TOTAL + 7, total < WNBA_AVG_TOTAL - 7);
    // Without a line, fire on clear stylistic mismatch
    return edge(highCount === 2, lowCount === 2);
  },
  // Line vs 3-year WNBA historical median: use total if available, else pace profile
  historicalMedian: (home: string, away: string, total: number|null) => {
    if (total !== null) return edge(total < WNBA_AVG_TOTAL - 5, total > WNBA_AVG_TOTAL + 5);
    // No line: one high-pace + one high-pace team historically goes over median
    const highCount = [home,away].filter(t => HIGH_PACE.includes(t)).length;
    return edge(highCount === 2, false);
  },
  // Arena factor: expansion/dome teams boost pace
  arenaFactor: (home: string) => {
    return edge(HIGH_PACE.includes(home), LOW_PACE.includes(home));
  },
  staleLine: (o: number|null, c: number|null, inj: InjuryReport[]) =>
    (!o||!c) ? edge(false,false) : edge(false, Math.abs(c-o) < 0.5 && inj.some(i => i.impact_level==='high')),
};

function sizing(n: number) { return n<=1?0:n===2?1.25:n===3?2:3; }

export function runModel(game: GameInput): ModelOutput {
  const g = game;
  const results = [
    { name:'back_to_back',        ...edges.backToBack(g.schedule_context) },
    { name:'travel_fatigue',      ...edges.travelFatigue(g.schedule_context) },
    { name:'injury',              ...edges.injury(g.injuries) },
    { name:'pace_mismatch',       ...edges.paceMismatch(g.pace_differential) },
    { name:'line_movement',       ...edges.lineMovement(g.opening_line, g.total) },
    { name:'rest_asymmetry',      ...edges.restAsymmetry(g.schedule_context) },
    { name:'venue_effect',        ...edges.venueEffect(g.home_team, g.away_team) },
    { name:'defensive_matchup',   ...edges.defensiveMatchup(g.home_team, g.away_team, g.total) },
    { name:'historical_median',   ...edges.historicalMedian(g.home_team, g.away_team, g.total) },
    { name:'arena_factor',        ...edges.arenaFactor(g.home_team) },
    { name:'stale_line_with_news',...edges.staleLine(g.opening_line, g.total, g.injuries) },
  ];

  const over = results.filter(e => e.over).map(e => e.name);
  const under = results.filter(e => e.under).map(e => e.name);
  const conflict = over.length > 0 && under.length > 0;

  let direction: 'over'|'under'|'skip' = 'skip';
  let edges_fired: string[] = [];

  if (!conflict) {
    if (over.length >= 2)  { direction = 'over';  edges_fired = over; }
    if (under.length >= 2) { direction = 'under'; edges_fired = under; }
  } else {
    edges_fired = [...over.map(e=>`OVER:${e}`), ...under.map(e=>`UNDER:${e}`)];
  }

  const edge_count = edges_fired.filter(e => !e.includes(':')).length;
  const sz = sizing(edge_count);
  const reasoning = direction === 'skip'
    ? `No bet: <2 aligned edges for ${g.away_team} @ ${g.home_team}.${conflict?' Conflicting signals.':''}`
    : `${direction.toUpperCase()} ${g.total} -- ${edge_count} edge(s): ${edges_fired.join(', ')}. Size: ${sz}%`;

  return { edge_count, edges_fired, direction, sizing: sz, reasoning };
}
