import type { GameInput, ModelOutput, InjuryReport, ScheduleContext } from '@/lib/types';

const WNBA_AVG_TOTAL = 167;

// Score: +2 = strong over lean, +1 = mild over lean, -1 = mild under lean, -2 = strong under lean
const PACE_SCORE: Record<string, number> = {
  'Las Vegas Aces': 2, 'New York Liberty': 2, 'Seattle Storm': 1,
  'Chicago Sky': 1, 'Golden State Valkyries': 1, 'Atlanta Dream': 1,
  'Dallas Wings': 1, 'Los Angeles Sparks': 1, 'Toronto Tempo': 1,
  'Indiana Fever': -1, 'Connecticut Sun': -2, 'Minnesota Lynx': -2,
  'Washington Mystics': -1, 'Phoenix Mercury': -1, 'Portland Fire': -1,
};

function paceScore(home: string, away: string) {
  return (PACE_SCORE[home] ?? 0) + (PACE_SCORE[away] ?? 0);
}

const edge = (over: boolean, under: boolean) => ({ over, under });

const edges = {
  backToBack: (s: ScheduleContext) =>
    edge(false, s.home_back_to_back || s.away_back_to_back),

  travelFatigue: (s: ScheduleContext) =>
    edge(false, s.away_travel && s.away_days_rest <= 1),

  injury: (inj: InjuryReport[]) =>
    edge(false, inj.some(i => i.impact_level === 'high' && i.status === 'out')),

  paceMismatch: (d: number | null) =>
    d === null ? edge(false, false) : edge(d > 5, d < -5),

  lineMovement: (o: number | null, c: number | null) =>
    (!o || !c) ? edge(false, false) : edge(c - o < -1.5, c - o > 1.5),

  restAsymmetry: (s: ScheduleContext) => {
    const diff = Math.abs(s.home_days_rest - s.away_days_rest);
    return edge(false, diff >= 2);
  },

  // Net pace score across both teams: positive = over lean, negative = under lean
  venueEffect: (home: string, away: string) => {
    const net = paceScore(home, away);
    return edge(net >= 2, net <= -2);
  },

  // Mild pace lean: fires on net ≥1 or ≤-1
  defensiveMatchup: (home: string, away: string, total: number | null) => {
    if (total !== null) return edge(total > WNBA_AVG_TOTAL + 7, total < WNBA_AVG_TOTAL - 7);
    const net = paceScore(home, away);
    return edge(net >= 1, net <= -1);
  },

  // Total vs historical median; falls back to pace profile
  historicalMedian: (home: string, away: string, total: number | null) => {
    if (total !== null) return edge(total < WNBA_AVG_TOTAL - 5, total > WNBA_AVG_TOTAL + 5);
    const net = paceScore(home, away);
    return edge(net >= 2, net <= -2);
  },

  // Home team pace identity (they set the tempo)
  arenaFactor: (home: string) => {
    const s = PACE_SCORE[home] ?? 0;
    return edge(s > 0, s < 0);
  },

  staleLine: (o: number | null, c: number | null, inj: InjuryReport[]) =>
    (!o || !c) ? edge(false, false)
      : edge(false, Math.abs(c - o) < 0.5 && inj.some(i => i.impact_level === 'high')),
};

function sizing(n: number) { return n <= 1 ? 0 : n === 2 ? 1.25 : n === 3 ? 2 : 3; }

function evaluate(g: GameInput, minEdges: number): ModelOutput {
  const results = [
    { name: 'back_to_back',         ...edges.backToBack(g.schedule_context) },
    { name: 'travel_fatigue',       ...edges.travelFatigue(g.schedule_context) },
    { name: 'injury',               ...edges.injury(g.injuries) },
    { name: 'pace_mismatch',        ...edges.paceMismatch(g.pace_differential) },
    { name: 'line_movement',        ...edges.lineMovement(g.opening_line, g.total) },
    { name: 'rest_asymmetry',       ...edges.restAsymmetry(g.schedule_context) },
    { name: 'venue_effect',         ...edges.venueEffect(g.home_team, g.away_team) },
    { name: 'defensive_matchup',    ...edges.defensiveMatchup(g.home_team, g.away_team, g.total) },
    { name: 'historical_median',    ...edges.historicalMedian(g.home_team, g.away_team, g.total) },
    { name: 'arena_factor',         ...edges.arenaFactor(g.home_team) },
    { name: 'stale_line_with_news', ...edges.staleLine(g.opening_line, g.total, g.injuries) },
  ];

  const over = results.filter(e => e.over).map(e => e.name);
  const under = results.filter(e => e.under).map(e => e.name);
  const conflict = over.length > 0 && under.length > 0;

  let direction: 'over' | 'under' | 'skip' = 'skip';
  let edges_fired: string[] = [];

  if (!conflict) {
    if (over.length >= minEdges)  { direction = 'over';  edges_fired = over; }
    if (under.length >= minEdges) { direction = 'under'; edges_fired = under; }
  } else {
    // Conflict: go with whichever side has more edges, skip if tied
    if (over.length > under.length + 1) { direction = 'over'; edges_fired = over; }
    else if (under.length > over.length + 1) { direction = 'under'; edges_fired = under; }
    else edges_fired = [...over.map(e => `OVER:${e}`), ...under.map(e => `UNDER:${e}`)];
  }

  const edge_count = edges_fired.filter(e => !e.includes(':')).length;
  const sz = sizing(edge_count);
  const label = minEdges === 1 ? '[BACKFILL] ' : '';
  const reasoning = direction === 'skip'
    ? `No bet: insufficient aligned edges for ${g.away_team} @ ${g.home_team}.${conflict ? ' Conflicting signals.' : ''}`
    : `${label}${direction.toUpperCase()} ${g.total ?? '?'} -- ${edge_count} edge(s): ${edges_fired.join(', ')}. Size: ${sz}%`;

  return { edge_count, edges_fired, direction, sizing: sz, reasoning };
}

// Live model: requires 2+ aligned edges (high confidence only)
export function runModel(game: GameInput): ModelOutput {
  return evaluate(game, 2);
}

// Backfill: 1-edge threshold so historical games without live lines still produce picks
export function runModelBackfill(game: GameInput): ModelOutput {
  return evaluate(game, 1);
}
