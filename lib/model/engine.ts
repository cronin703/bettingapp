import type { InjuryReport, ModelOutput } from '@/lib/types';
import type { GameContext } from '@/lib/sources/game-context';

export interface FullGameInput {
  home_team: string;
  away_team: string;
  date: string;
  tipoff_time: string;
  context: GameContext;
  injuries: InjuryReport[];
}

interface EdgeResult {
  name: string;
  fired: boolean;
  direction: 'over' | 'under' | null; // null = NO DATA or not fired
  reason: string;
}

// ─── The 11 Structural Edges ───────────────────────────────────────────────

function e1_fatigue(ctx: GameContext): EdgeResult {
  const fired = ctx.home_back_to_back || ctx.away_back_to_back || ctx.home_3_in_4 || ctx.away_3_in_4;
  const parts = [];
  if (ctx.home_back_to_back) parts.push('home B2B');
  if (ctx.away_back_to_back) parts.push('away B2B');
  if (ctx.home_3_in_4) parts.push('home 3-in-4');
  if (ctx.away_3_in_4) parts.push('away 3-in-4');
  return {
    name: 'E1 Back-to-Back/Fatigue',
    fired,
    direction: fired ? 'under' : null,
    reason: fired ? parts.join(', ') : 'No fatigue flags',
  };
}

function e2_slowPace(ctx: GameContext): EdgeResult {
  // Both teams bottom-10 in possessions per 40 (rank 3+ out of 12 teams → rank >= 10 = slowest)
  const { home_pace_rank, away_pace_rank } = ctx;
  if (home_pace_rank === null || away_pace_rank === null)
    return { name: 'E2 Slow vs Slow Pace', fired: false, direction: null, reason: 'NO DATA — pace ranks unavailable' };
  const bothSlow = home_pace_rank >= 10 && away_pace_rank >= 10;
  return {
    name: 'E2 Slow vs Slow Pace',
    fired: bothSlow,
    direction: bothSlow ? 'under' : null,
    reason: bothSlow
      ? `Both slow: home rank ${home_pace_rank}, away rank ${away_pace_rank}`
      : `Not both slow: home rank ${home_pace_rank}, away rank ${away_pace_rank}`,
  };
}

function e3_eliteDefHome(ctx: GameContext): EdgeResult {
  const { home_def_rtg_rank, season_week } = ctx;
  if (home_def_rtg_rank === null)
    return { name: 'E3 Elite Defense at Home', fired: false, direction: null, reason: 'NO DATA — DEF RTG rank unavailable' };
  // Apply SOS filter: weeks 1-4, discount DEF RTG
  if (season_week !== null && season_week <= 4)
    return { name: 'E3 Elite Defense at Home', fired: false, direction: null, reason: `Early season (week ${season_week}) — SOS filter applied, DEF RTG unreliable` };
  const fired = home_def_rtg_rank <= 5;
  return {
    name: 'E3 Elite Defense at Home',
    fired,
    direction: fired ? 'under' : null,
    reason: fired
      ? `Home team top-5 DEF RTG (rank ${home_def_rtg_rank})`
      : `Home DEF RTG rank ${home_def_rtg_rank} — not top-5`,
  };
}

function e4_refereeCrew(ctx: GameContext): EdgeResult {
  if (!ctx.referee_crew || !ctx.referee_tendency)
    return { name: 'E4 Referee Crew', fired: false, direction: null, reason: 'NO DATA — crew not yet assigned or unavailable' };
  const fired = ctx.referee_tendency !== 'neutral';
  return {
    name: 'E4 Referee Crew',
    fired,
    direction: fired ? (ctx.referee_tendency === 'foul-heavy' ? 'over' : 'under') : null,
    reason: fired
      ? `${ctx.referee_crew} — ${ctx.referee_tendency} crew`
      : `${ctx.referee_crew} — neutral crew`,
  };
}

function e5_earlySeason(ctx: GameContext): EdgeResult {
  if (ctx.season_week === null)
    return { name: 'E5 Early Season', fired: false, direction: null, reason: 'NO DATA — season week unavailable' };
  const fired = ctx.season_week <= 4;
  return {
    name: 'E5 Early Season',
    fired,
    direction: fired ? 'under' : null,
    reason: fired ? `Week ${ctx.season_week} — early season flag` : `Week ${ctx.season_week} — not early season`,
  };
}

function e6_playerOut(injuries: InjuryReport[]): EdgeResult {
  const out = injuries.filter(i => i.status === 'out' && i.impact_level === 'high');
  if (!out.length)
    return { name: 'E6 Key Playmaker Out', fired: false, direction: null, reason: 'No high-impact players ruled out' };

  // Rim protector out = over signal; ball-handler/scorer out = under signal
  const rimOut = out.some(i => ['C', 'F', 'PF', 'SF'].includes(i.position.toUpperCase()));
  const ballHandlerOut = out.some(i => ['G', 'PG', 'SG'].includes(i.position.toUpperCase()));
  const names = out.map(i => `${i.player} (${i.team})`).join(', ');

  if (rimOut && ballHandlerOut) return { name: 'E6 Key Playmaker Out', fired: false, direction: null, reason: `Mixed: ${names} — rim protector and ball-handler both out, skip` };
  return {
    name: 'E6 Key Playmaker Out',
    fired: true,
    direction: rimOut ? 'over' : 'under',
    reason: `${names} out — ${rimOut ? 'rim protector (over signal)' : 'ball-handler/scorer (under signal)'}`,
  };
}

function e7_reverseLineMovement(ctx: GameContext): EdgeResult {
  const { opening_total, current_total, public_pct_over } = ctx;
  if (opening_total === null || current_total === null)
    return { name: 'E7 Reverse Line Movement', fired: false, direction: null, reason: 'NO DATA — line movement unavailable' };

  const dropped = current_total < opening_total - 0.4;
  const publicOnOver = public_pct_over !== null && public_pct_over >= 60;
  const fired = dropped && publicOnOver;
  return {
    name: 'E7 Reverse Line Movement',
    fired,
    direction: fired ? 'under' : null,
    reason: fired
      ? `Total dropped ${opening_total} → ${current_total} despite ${public_pct_over}% public on Over (sharp Under)`
      : `Open: ${opening_total}, Current: ${current_total}, Public Over: ${public_pct_over ?? 'unknown'}%`,
  };
}

function e8_shootingRegression(ctx: GameContext): EdgeResult {
  const { home_fg_pct_last5, away_fg_pct_last5, home_true_fg_pct, away_true_fg_pct } = ctx;
  if (!home_fg_pct_last5 || !away_fg_pct_last5 || !home_true_fg_pct || !away_true_fg_pct)
    return { name: 'E8 Shooting Regression', fired: false, direction: null, reason: 'NO DATA — FG% data unavailable' };

  const homeHot = home_fg_pct_last5 > home_true_fg_pct + 0.03;
  const awayCold = away_fg_pct_last5 < away_true_fg_pct - 0.03;
  const homeHotBig = home_fg_pct_last5 > home_true_fg_pct + 0.05;
  const awayHotBig = away_fg_pct_last5 > away_true_fg_pct + 0.05;

  if (homeHotBig || (homeHot && awayCold))
    return { name: 'E8 Shooting Regression', fired: true, direction: 'under', reason: `Team(s) shooting above true talent — expect regression` };
  if (awayHotBig)
    return { name: 'E8 Shooting Regression', fired: false, direction: null, reason: 'Marginal signal — skip' };
  return { name: 'E8 Shooting Regression', fired: false, direction: null, reason: 'No significant shooting deviation' };
}

function e9_scoringTrend(ctx: GameContext, total: number | null): EdgeResult {
  const { home_last10_totals, away_last10_totals, home_season_avg_total, away_season_avg_total } = ctx;
  if (!home_last10_totals.length || !away_last10_totals.length || !home_season_avg_total || !away_season_avg_total)
    return { name: 'E9 Scoring Trend', fired: false, direction: null, reason: 'NO DATA — recent game logs unavailable' };

  const countBelow = (games: number[], avg: number) => games.filter(g => g < avg).length;
  const homeBelowCount = countBelow(home_last10_totals, home_season_avg_total);
  const awayBelowCount = countBelow(away_last10_totals, away_season_avg_total);
  const homeUnderTrend = homeBelowCount >= 4;
  const awayUnderTrend = awayBelowCount >= 4;
  const homeAboveCount = home_last10_totals.filter(g => g > home_season_avg_total).length;
  const awayAboveCount = away_last10_totals.filter(g => g > away_season_avg_total).length;
  const homeOverTrend = homeAboveCount >= 4;
  const awayOverTrend = awayAboveCount >= 4;

  if ((homeUnderTrend || awayUnderTrend) && !homeOverTrend && !awayOverTrend)
    return { name: 'E9 Scoring Trend', fired: true, direction: 'under', reason: `Home ${homeBelowCount}/10 below avg, Away ${awayBelowCount}/10 below avg — Under trend` };
  if ((homeOverTrend || awayOverTrend) && !homeUnderTrend && !awayUnderTrend)
    return { name: 'E9 Scoring Trend', fired: true, direction: 'over', reason: `Home ${homeAboveCount}/10 above avg, Away ${awayAboveCount}/10 above avg — Over trend` };

  return { name: 'E9 Scoring Trend', fired: false, direction: null, reason: `Home: ${homeBelowCount}/10 below, ${homeAboveCount}/10 above. Away: ${awayBelowCount}/10 below. No clear trend.` };
}

function e10_travel(ctx: GameContext): EdgeResult {
  const fired = ctx.away_cross_country_travel;
  // Early tipoff amplifies travel disadvantage
  const earlyTipoff = ctx.tipoff_hour_et !== null && ctx.tipoff_hour_et < 14;
  return {
    name: 'E10 Travel Disadvantage',
    fired,
    direction: fired ? 'under' : null,
    reason: fired
      ? `Away team cross-country travel within 24hrs${earlyTipoff ? ' + early tipoff' : ''}`
      : 'No significant travel disadvantage',
  };
}

function e11_lookAhead(ctx: GameContext, fired_count: number): EdgeResult {
  // Cannot be standalone — only modifier when other under edges present
  // We approximate look-ahead from the schedule data — not standalone
  return {
    name: 'E11 Look-Ahead Spot',
    fired: false,
    direction: null,
    reason: 'Look-ahead data not available — would only modify existing Under call, never standalone',
  };
}

// ─── Sizing ────────────────────────────────────────────────────────────────

function sizing(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 1.25;
  if (n === 3) return 2;
  return 3;
}

// ─── Main Evaluator ────────────────────────────────────────────────────────

export function runModel(input: FullGameInput): ModelOutput & { edge_results: EdgeResult[] } {
  const { context: ctx, injuries } = input;
  const total = ctx.current_total ?? ctx.opening_total ?? null;

  const edgeResults: EdgeResult[] = [
    e1_fatigue(ctx),
    e2_slowPace(ctx),
    e3_eliteDefHome(ctx),
    e4_refereeCrew(ctx),
    e5_earlySeason(ctx),
    e6_playerOut(injuries),
    e7_reverseLineMovement(ctx),
    e8_shootingRegression(ctx),
    e9_scoringTrend(ctx, total),
    e10_travel(ctx),
    e11_lookAhead(ctx, 0),
  ];

  const overEdges = edgeResults.filter(e => e.fired && e.direction === 'over').map(e => e.name);
  const underEdges = edgeResults.filter(e => e.fired && e.direction === 'under').map(e => e.name);
  const conflict = overEdges.length > 0 && underEdges.length > 0;

  let direction: 'over' | 'under' | 'skip' = 'skip';
  let edges_fired: string[] = [];

  if (!conflict) {
    if (overEdges.length >= 2)  { direction = 'over';  edges_fired = overEdges; }
    if (underEdges.length >= 2) { direction = 'under'; edges_fired = underEdges; }
  } else {
    // Go with the stronger side if it leads by 2+, otherwise skip
    if (underEdges.length >= overEdges.length + 2) { direction = 'under'; edges_fired = underEdges; }
    else if (overEdges.length >= underEdges.length + 2) { direction = 'over'; edges_fired = overEdges; }
    else edges_fired = [...overEdges.map(e => `OVER:${e}`), ...underEdges.map(e => `UNDER:${e}`)];
  }

  const edge_count = edges_fired.filter(e => !e.includes(':')).length;
  const sz = sizing(edge_count);
  const reasoning = direction === 'skip'
    ? `No bet: ${conflict ? 'conflicting signals' : `only ${Math.max(overEdges.length, underEdges.length)} aligned edge(s)`} for ${input.away_team} @ ${input.home_team}.`
    : `${direction.toUpperCase()} ${total ?? '?'} — ${edge_count} edge(s): ${edges_fired.join(', ')}. Size: ${sz}%`;

  return { edge_count, edges_fired, direction, sizing: sz, reasoning, edge_results: edgeResults };
}

// Backfill: 1-edge threshold for historical data without live lines
export function runModelBackfill(input: FullGameInput): ModelOutput & { edge_results: EdgeResult[] } {
  const base = runModel(input);
  if (base.direction !== 'skip') return base;

  // Try with 1-edge threshold
  const { context: ctx, injuries } = input;
  const edgeResults = base.edge_results;
  const underEdges = edgeResults.filter(e => e.fired && e.direction === 'under').map(e => e.name);
  const overEdges = edgeResults.filter(e => e.fired && e.direction === 'over').map(e => e.name);
  const conflict = overEdges.length > 0 && underEdges.length > 0;

  if (!conflict) {
    if (underEdges.length === 1) return { ...base, direction: 'under', edges_fired: underEdges, edge_count: 1, sizing: 0, reasoning: `[BACKFILL] UNDER — 1 edge: ${underEdges[0]}` };
    if (overEdges.length === 1)  return { ...base, direction: 'over',  edges_fired: overEdges,  edge_count: 1, sizing: 0, reasoning: `[BACKFILL] OVER — 1 edge: ${overEdges[0]}` };
  }
  return base;
}
