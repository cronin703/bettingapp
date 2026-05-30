import type { GameInput, ModelOutput, InjuryReport, ScheduleContext } from '@/lib/types';

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
  venueEffect: () => edge(false, false),
  defensiveMatchup: () => edge(false, false),
  historicalMedian: () => edge(false, false),
  arenaFactor: () => edge(false, false),
  staleLine: (o: number|null, c: number|null, inj: InjuryReport[]) =>
    (!o||!c) ? edge(false,false) : edge(false, Math.abs(c-o) < 0.5 && inj.some(i => i.impact_level==='high')),
};

function sizing(n: number) { return n<=1?0:n===2?1.25:n===3?2:3; }

export function runModel(game: GameInput): ModelOutput {
  const g = game;
  const results = [
    { name:'back_to_back',       ...edges.backToBack(g.schedule_context) },
    { name:'travel_fatigue',     ...edges.travelFatigue(g.schedule_context) },
    { name:'injury',             ...edges.injury(g.injuries) },
    { name:'pace_mismatch',      ...edges.paceMismatch(g.pace_differential) },
    { name:'line_movement',      ...edges.lineMovement(g.opening_line, g.total) },
    { name:'rest_asymmetry',     ...edges.restAsymmetry(g.schedule_context) },
    { name:'venue_effect',       ...edges.venueEffect() },
    { name:'defensive_matchup',  ...edges.defensiveMatchup() },
    { name:'historical_median',  ...edges.historicalMedian() },
    { name:'arena_factor',       ...edges.arenaFactor() },
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
