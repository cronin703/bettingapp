/**
 * WNBA Totals Model — Expert Bettor Framework v5
 * 13 Structural Edges + 6 Pro Tools
 * 2026 Season Edition
 */
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

export interface EdgeResult {
  name: string;
  fired: boolean;
  direction: 'over' | 'under' | null;
  reason: string;
}

// ─── Expansion team discount (Edge 13) ────────────────────────────────────
// Apply ~30% discount to efficiency metrics for POR/TOR through ~Week 8
function expansionDiscount(val: number | null, isExpansion: boolean): number | null {
  if (val === null || !isExpansion) return val;
  return val * 0.7;
}

// ─── The 13 Structural Edges ───────────────────────────────────────────────

// ⭐⭐⭐ E1 — Back-to-Back / Fatigue
function e1_fatigue(ctx: GameContext): EdgeResult {
  const flags = [
    ctx.home_back_to_back && 'home B2B',
    ctx.away_back_to_back && 'away B2B',
    ctx.home_3_in_4 && 'home 3-in-4',
    ctx.away_3_in_4 && 'away 3-in-4',
  ].filter(Boolean) as string[];
  const fired = flags.length > 0;
  return { name: 'E1 Back-to-Back/Fatigue', fired, direction: fired ? 'under' : null, reason: fired ? flags.join(', ') : 'No fatigue flags' };
}

// ⭐⭐⭐ E2 — Slow vs. Slow Pace (both bottom-10 of 15 teams = rank ≥ 6 from bottom = rank ≥ 10)
function e2_slowPace(ctx: GameContext, homeIsExp: boolean, awayIsExp: boolean): EdgeResult {
  const hr = expansionDiscount(ctx.home_pace_rank, homeIsExp);
  const ar = expansionDiscount(ctx.away_pace_rank, awayIsExp);
  if (hr === null || ar === null)
    return { name: 'E2 Slow vs Slow Pace', fired: false, direction: null, reason: 'NO DATA — pace ranks unavailable' };
  // In a 15-team league, bottom-10 = rank ≥ 6 (rank 6–15 from fastest)
  const bothSlow = hr >= 6 && ar >= 6;
  return {
    name: 'E2 Slow vs Slow Pace', fired: bothSlow,
    direction: bothSlow ? 'under' : null,
    reason: bothSlow ? `Both slow: home rank ${ctx.home_pace_rank}${homeIsExp?' (expansion discount)':''}, away rank ${ctx.away_pace_rank}${awayIsExp?' (expansion discount)':''}` : `Not both slow: home rank ${ctx.home_pace_rank}, away rank ${ctx.away_pace_rank}`,
  };
}

// ⭐⭐ E3 — Elite Defense at Home (top-5 DEF RTG, SOS-filtered)
function e3_eliteDefHome(ctx: GameContext, homeIsExp: boolean): EdgeResult {
  const rank = ctx.home_def_rtg_rank;
  if (rank === null) return { name: 'E3 Elite Defense at Home', fired: false, direction: null, reason: 'NO DATA — DEF RTG rank unavailable' };
  // SOS filter: weeks 1–6 in 2026, DEF RTG unreliable
  if (ctx.season_week !== null && ctx.season_week <= 6)
    return { name: 'E3 Elite Defense at Home', fired: false, direction: null, reason: `Week ${ctx.season_week} — SOS filter active through Week 6, DEF RTG discounted` };
  if (homeIsExp)
    return { name: 'E3 Elite Defense at Home', fired: false, direction: null, reason: 'Expansion team — Edge 13 discount applied, DEF RTG unreliable' };
  const fired = rank <= 5;
  const crowdBonus = fired && ctx.home_high_crowd_venue ? ' + high-crowd venue bonus' : '';
  return {
    name: 'E3 Elite Defense at Home', fired,
    direction: fired ? 'under' : null,
    reason: fired ? `Home top-5 DEF RTG (rank ${rank})${crowdBonus}` : `Home DEF RTG rank ${rank} — not top-5`,
  };
}

// ⭐⭐ E4 — Referee Crew Tendencies
function e4_refereeCrew(ctx: GameContext): EdgeResult {
  if (!ctx.referee_crew || !ctx.referee_tendency)
    return { name: 'E4 Referee Crew', fired: false, direction: null, reason: 'NO DATA — crew not yet assigned or unavailable' };
  const fired = ctx.referee_tendency !== 'neutral';
  return {
    name: 'E4 Referee Crew', fired,
    direction: fired ? (ctx.referee_tendency === 'foul-heavy' ? 'over' : 'under') : null,
    reason: fired ? `${ctx.referee_crew} — ${ctx.referee_tendency}` : `${ctx.referee_crew} — neutral`,
  };
}

// ⭐⭐⭐ E5 — Early-Season Market Inefficiency (Weeks 1–4, expires Week 6)
function e5_earlySeason(ctx: GameContext): EdgeResult {
  if (ctx.season_week === null)
    return { name: 'E5 Early Season', fired: false, direction: null, reason: 'NO DATA — season week unavailable' };
  if (ctx.season_week > 6)
    return { name: 'E5 Early Season', fired: false, direction: null, reason: `Week ${ctx.season_week} — edge expired after Week 6` };
  if (ctx.season_week > 4)
    return { name: 'E5 Early Season', fired: false, direction: null, reason: `Week ${ctx.season_week} — diminishing weight (weeks 5–6 transition window)` };
  return { name: 'E5 Early Season', fired: true, direction: 'under', reason: `Week ${ctx.season_week} — early-season market inefficiency active` };
}

// ⭐⭐⭐ E6 — Key Playmaker Out / Injury Clustering
function e6_playerOut(injuries: InjuryReport[]): EdgeResult {
  const out = injuries.filter(i => i.status === 'out' && i.impact_level === 'high');
  if (!out.length) return { name: 'E6 Key Playmaker Out', fired: false, direction: null, reason: 'No high-impact players ruled out' };
  const rimOut = out.some(i => ['C', 'F', 'PF', 'SF'].includes(i.position.toUpperCase()));
  const guardOut = out.some(i => ['G', 'PG', 'SG'].includes(i.position.toUpperCase()));
  const names = out.map(i => `${i.player} (${i.team})`).join(', ');
  if (rimOut && guardOut)
    return { name: 'E6 Key Playmaker Out', fired: false, direction: null, reason: `Mixed signals: ${names} — rim protector + ball-handler both out, skip` };
  return {
    name: 'E6 Key Playmaker Out', fired: true,
    direction: rimOut ? 'over' : 'under',
    reason: `${names} — ${rimOut ? 'rim protector out (over signal)' : 'ball-handler/scorer out (under signal)'}`,
  };
}

// ⭐⭐⭐ E7 — Reverse Line Movement (+ steam move detection)
function e7_rlm(ctx: GameContext): EdgeResult {
  const { opening_total, current_total, public_pct_over, steam_move_under } = ctx;
  if (steam_move_under)
    return { name: 'E7 Reverse Line Movement / Steam', fired: true, direction: 'under', reason: 'Steam move detected — coordinated sharp money on under' };
  if (opening_total === null || current_total === null)
    return { name: 'E7 Reverse Line Movement / Steam', fired: false, direction: null, reason: 'NO DATA — line movement unavailable' };
  const dropped = current_total < opening_total - 0.4;
  const publicOnOver = public_pct_over !== null && public_pct_over >= 60;
  const fired = dropped && publicOnOver;
  return {
    name: 'E7 Reverse Line Movement / Steam', fired, direction: fired ? 'under' : null,
    reason: fired
      ? `Total dropped ${opening_total}→${current_total} despite ${public_pct_over}% public on Over — sharp under signal`
      : `Open: ${opening_total}, Current: ${current_total}, Public Over: ${public_pct_over ?? 'unknown'}%`,
  };
}

// ⭐⭐ E8 — Shooting Regression (Haslametrics ABS / FG Performance)
function e8_regression(ctx: GameContext, homeIsExp: boolean, awayIsExp: boolean): EdgeResult {
  const hLast = ctx.home_fg_pct_last5;
  const aLast = ctx.away_fg_pct_last5;
  const hTrue = ctx.home_true_fg_pct;
  const aTrue = ctx.away_true_fg_pct;
  if (!hLast || !aLast || !hTrue || !aTrue)
    return { name: 'E8 Shooting Regression', fired: false, direction: null, reason: 'NO DATA — FG% data unavailable' };
  // Apply expansion discount to regression thresholds
  const hDelta = hLast - (homeIsExp ? hTrue * 0.7 : hTrue);
  const aDelta = aLast - (awayIsExp ? aTrue * 0.7 : aTrue);
  if (hDelta > 0.05 || (hDelta > 0.03 && aDelta < -0.03))
    return { name: 'E8 Shooting Regression', fired: true, direction: 'under', reason: `Team(s) shooting significantly above true talent — regression expected` };
  if (aDelta > 0.05)
    return { name: 'E8 Shooting Regression', fired: false, direction: null, reason: 'Marginal over signal — insufficient to act alone' };
  return { name: 'E8 Shooting Regression', fired: false, direction: null, reason: 'No significant shooting deviation from true talent' };
}

// ⭐⭐ E9 — Recent Scoring Trend
function e9_scoringTrend(ctx: GameContext, homeIsExp: boolean, awayIsExp: boolean): EdgeResult {
  const hGames = ctx.home_last10_totals;
  const aGames = ctx.away_last10_totals;
  const hAvg = homeIsExp ? (ctx.home_season_avg_total ? ctx.home_season_avg_total * 0.7 : null) : ctx.home_season_avg_total;
  const aAvg = awayIsExp ? (ctx.away_season_avg_total ? ctx.away_season_avg_total * 0.7 : null) : ctx.away_season_avg_total;
  if (!hGames.length || !aGames.length || !hAvg || !aAvg)
    return { name: 'E9 Scoring Trend', fired: false, direction: null, reason: 'NO DATA — recent game logs unavailable' };
  const hBelow = hGames.filter(g => g < hAvg).length;
  const aBelow = aGames.filter(g => g < aAvg).length;
  const hAbove = hGames.filter(g => g > hAvg).length;
  const aAbove = aGames.filter(g => g > aAvg).length;
  if ((hBelow >= 4 || aBelow >= 4) && hAbove < 4 && aAbove < 4)
    return { name: 'E9 Scoring Trend', fired: true, direction: 'under', reason: `Home ${hBelow}/10 below avg, Away ${aBelow}/10 below avg — active under trend` };
  if ((hAbove >= 4 || aAbove >= 4) && hBelow < 4 && aBelow < 4)
    return { name: 'E9 Scoring Trend', fired: true, direction: 'over', reason: `Home ${hAbove}/10 above avg, Away ${aAbove}/10 above avg — active over trend` };
  return { name: 'E9 Scoring Trend', fired: false, direction: null, reason: `Home: ${hBelow}/10 below, ${hAbove}/10 above. Away: ${aBelow}/10 below. No clear trend.` };
}

// ⭐⭐ E10 — Travel and Time Zone Disadvantage
function e10_travel(ctx: GameContext): EdgeResult {
  const fired = ctx.away_cross_country_travel;
  const earlyTipoff = ctx.tipoff_hour_et !== null && ctx.tipoff_hour_et < 14;
  return {
    name: 'E10 Travel Disadvantage', fired, direction: fired ? 'under' : null,
    reason: fired ? `Away team cross-country travel within 24hrs${earlyTipoff ? ' + early tipoff amplifies impact' : ''}` : 'No significant travel disadvantage',
  };
}

// ⭐⭐ E11 — Look-Ahead Spot (not standalone — stacks only)
function e11_lookAhead(ctx: GameContext, otherUnderCount: number): EdgeResult {
  const fired = (ctx.home_marquee_game_within_48h || ctx.away_marquee_game_within_48h) && otherUnderCount >= 1;
  const who = [ctx.home_marquee_game_within_48h && 'home', ctx.away_marquee_game_within_48h && 'away'].filter(Boolean).join('+');
  return {
    name: 'E11 Look-Ahead Spot', fired, direction: fired ? 'under' : null,
    reason: fired ? `${who} team has marquee game within 48hrs — stacks with existing under signal` : (!ctx.home_marquee_game_within_48h && !ctx.away_marquee_game_within_48h ? 'No look-ahead flags' : 'Look-ahead present but no structural under to stack with — NOT standalone'),
  };
}

// ⭐⭐ E12 — Commissioner's Cup Motivation Asymmetry (NEW, Jun 1–17)
function e12_commissionersCup(ctx: GameContext): EdgeResult {
  if (!ctx.is_commissioners_cup_window)
    return { name: 'E12 Commissioner\'s Cup', fired: false, direction: null, reason: 'Outside Commissioner\'s Cup window (Jun 1–17)' };
  // Over: both teams alive with differential in play
  if (ctx.home_cup_alive && ctx.away_cup_alive && ctx.cup_differential_in_play)
    return { name: 'E12 Commissioner\'s Cup', fired: true, direction: 'over', reason: 'Both teams Cup-alive with point differential as live tiebreaker — incentive to run up score' };
  // Under: one/both eliminated with big regular-season game upcoming (stack with E11)
  if (ctx.home_cup_alive === false || ctx.away_cup_alive === false)
    return { name: 'E12 Commissioner\'s Cup', fired: false, direction: null, reason: 'One team Cup-eliminated — use look-ahead stack (E11) instead' };
  return { name: 'E12 Commissioner\'s Cup', fired: false, direction: null, reason: 'Cup window active but asymmetry not sufficient for bet signal' };
}

// ⭐⭐ E13 — Expansion Team Discount (Portland Fire / Toronto Tempo through ~Week 8)
function e13_expansionDiscount(ctx: GameContext, homeIsExp: boolean, awayIsExp: boolean): EdgeResult {
  if (!homeIsExp && !awayIsExp)
    return { name: 'E13 Expansion Team Discount', fired: false, direction: null, reason: 'No expansion teams in this game' };
  if (ctx.season_week !== null && ctx.season_week > 8)
    return { name: 'E13 Expansion Team Discount', fired: false, direction: null, reason: `Week ${ctx.season_week} — expansion discount expired after Week 8` };
  const teams = [homeIsExp && 'home', awayIsExp && 'away'].filter(Boolean).join('+');
  return {
    name: 'E13 Expansion Team Discount', fired: true, direction: null,
    reason: `${teams} team is an expansion franchise — 30% discount applied to efficiency metrics in E2, E3, E8, E9`,
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
function evaluate(input: FullGameInput, minEdges: number): ModelOutput & { edge_results: EdgeResult[] } {
  const { context: ctx, injuries } = input;
  const homeIsExp = ctx.home_is_expansion;
  const awayIsExp = ctx.away_is_expansion;

  // Pass 1: run all edges except E11 (needs under count) and E13 (modifier only)
  const pass1: EdgeResult[] = [
    e1_fatigue(ctx),
    e2_slowPace(ctx, homeIsExp, awayIsExp),
    e3_eliteDefHome(ctx, homeIsExp),
    e4_refereeCrew(ctx),
    e5_earlySeason(ctx),
    e6_playerOut(injuries),
    e7_rlm(ctx),
    e8_regression(ctx, homeIsExp, awayIsExp),
    e9_scoringTrend(ctx, homeIsExp, awayIsExp),
    e10_travel(ctx),
    e12_commissionersCup(ctx),
  ];

  const underCountPass1 = pass1.filter(e => e.fired && e.direction === 'under').length;

  // Pass 2: add E11 (depends on under count) and E13 (informational)
  const edgeResults: EdgeResult[] = [
    ...pass1,
    e11_lookAhead(ctx, underCountPass1),
    e13_expansionDiscount(ctx, homeIsExp, awayIsExp),
  ];

  const overEdges  = edgeResults.filter(e => e.fired && e.direction === 'over').map(e => e.name);
  const underEdges = edgeResults.filter(e => e.fired && e.direction === 'under').map(e => e.name);
  const conflict   = overEdges.length > 0 && underEdges.length > 0;

  let direction: 'over' | 'under' | 'skip' = 'skip';
  let edges_fired: string[] = [];

  if (!conflict) {
    if (overEdges.length >= minEdges)  { direction = 'over';  edges_fired = overEdges; }
    if (underEdges.length >= minEdges) { direction = 'under'; edges_fired = underEdges; }
  } else {
    // Resolve conflict: side with 2+ more edges wins; otherwise skip
    if (underEdges.length >= overEdges.length + 2)  { direction = 'under'; edges_fired = underEdges; }
    else if (overEdges.length >= underEdges.length + 2) { direction = 'over'; edges_fired = overEdges; }
    else edges_fired = [...overEdges.map(e => `OVER:${e}`), ...underEdges.map(e => `UNDER:${e}`)];
  }

  const edge_count = edges_fired.filter(e => !e.includes(':')).length;
  const sz = sizing(edge_count);
  const total = ctx.current_total ?? ctx.opening_total ?? null;
  const label = minEdges === 1 ? '[BACKFILL] ' : '';
  const reasoning = direction === 'skip'
    ? `No bet: ${conflict ? 'conflicting signals' : `only ${Math.max(overEdges.length, underEdges.length)} aligned edge(s)`} for ${input.away_team} @ ${input.home_team}.`
    : `${label}${direction.toUpperCase()} ${total ?? '?'} — ${edge_count} edge(s): ${edges_fired.join(', ')}. Size: ${sz}%`;

  return { edge_count, edges_fired, direction, sizing: sz, reasoning, edge_results: edgeResults };
}

export function runModel(input: FullGameInput): ModelOutput & { edge_results: EdgeResult[] } {
  return evaluate(input, 2);
}

export function runModelBackfill(input: FullGameInput): ModelOutput & { edge_results: EdgeResult[] } {
  const base = evaluate(input, 2);
  if (base.direction !== 'skip') return base;
  return evaluate(input, 1);
}
