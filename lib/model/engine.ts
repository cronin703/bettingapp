import type { GameInput, ModelOutput, InjuryReport, ScheduleContext } from '@/lib/types';

const WNBA_AVG_TOTAL = 167; // 2024-25 season league average combined points

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
  // High scoring venue (above 172 historical avg at this arena) → over lean
  venueEffect: (home: string) => {
    const highScoring = ['Las Vegas Aces','New York Liberty','Seattle Storm','Chicago Sky'];
    const lowScoring = ['Indiana Fever','Connecticut Sun','Minnesota Lynx'];
    return edge(highScoring.includes(home), lowScoring.includes(home));
  },
  // If both teams rank high in pace (approximated by web-fetched lines being high)
  defensiveMatchup: (total: number|null) => {
    if (total === null) return edge(false, false);
    // Lines set well above average suggest books see an offensive matchup
    return edge(total > WNBA_AVG_TOTAL + 7, total < WNBA_AVG_TOTAL - 7);
  },
  // Line vs 3-year WNBA historical median (~167): extreme deviations often revert
  historicalMedian: (total: number|null) => {
    if (total === null) return edge(false, false);
    return edge(total < WNBA_AVG_TOTAL - 5, total > WNBA_AVG_TOTAL + 5);
  },
  // Certain arenas (smaller/louder) suppress scoring; dome arenas boost pace
  arenaFactor: (home: string) => {
    const domeBoost = ['Atlanta Dream','Dallas Wings'];
    const smallSuppress = ['Connecticut Sun','Minnesota Lynx','Indiana Fever'];
    return edge(domeBoost.includes(home), smallSuppress.includes(home));
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
    { name:'venue_effect',        ...edges.venueEffect(g.home_team) },
    { name:'defensive_matchup',   ...edges.defensiveMatchup(g.total) },
    { name:'historical_median',   ...edges.historicalMedian(g.total) },
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
