/**
 * Core model runner — shared by all cron routes and the self-healing logic.
 * Runs the full pipeline for a single date: schedule → context → model → DB.
 */
import { format, subDays, parseISO } from 'date-fns';
import { fetchTodaysSchedule, fetchGameScores } from '@/lib/sources/scores';
import { fetchInjuries } from '@/lib/sources/injuries';
import { fetchGameContext } from '@/lib/sources/game-context';
import { runModel, runModelBackfill, type FullGameInput } from '@/lib/model/engine';
import { upsertGame, upsertPick, updateResult } from '@/lib/db/queries';
import { sql } from '@vercel/postgres';

export interface RunResult {
  date: string;
  processed: number;
  settled: number;
  results: Array<{ game: string; direction: string; edges: number; score?: string }>;
}

export async function runForDate(date: string, backfill: boolean): Promise<RunResult> {
  const [games, scores] = await Promise.all([
    fetchTodaysSchedule(date),
    fetchGameScores(date),
  ]);

  const results = [];
  for (const game of games) {
    const gameId = await upsertGame({
      ...game,
      status: scores.some(s => s.home_team === game.home_team) ? 'final' : game.status,
    });

    const [context, hi, ai] = await Promise.all([
      fetchGameContext(game.home_team, game.away_team, date),
      fetchInjuries(game.home_team, date),
      fetchInjuries(game.away_team, date),
    ]);

    const input: FullGameInput = {
      home_team: game.home_team, away_team: game.away_team,
      date, tipoff_time: game.tipoff_time,
      context, injuries: [...hi, ...ai],
    };

    const out = backfill ? runModelBackfill(input) : runModel(input);
    const total = context.current_total ?? context.opening_total ?? null;

    const pickId = await upsertPick({
      game_id: gameId, direction: out.direction, edge_count: out.edge_count,
      edges_fired: out.edges_fired, line: total, model_call: out.reasoning,
      sizing: out.sizing, run_type: 'morning',
    });

    const score = scores.find(s => s.home_team === game.home_team && s.away_team === game.away_team);
    if (score) {
      const finalTotal = score.home_points + score.away_points;
      let result: 'win' | 'loss' | 'push' | 'no_bet' = 'no_bet';
      if (out.direction !== 'skip' && total !== null) {
        if (finalTotal > total) result = out.direction === 'over' ? 'win' : 'loss';
        else if (finalTotal < total) result = out.direction === 'under' ? 'win' : 'loss';
        else result = 'push';
      }
      await updateResult({
        pick_id: pickId, final_score_home: score.home_points, final_score_away: score.away_points,
        total: finalTotal, result, entry_line: total, closing_line: total, clv: null,
      });
    }

    results.push({
      game: `${game.away_team} @ ${game.home_team}`,
      direction: out.direction, edges: out.edge_count,
      score: score ? `${score.home_points}-${score.away_points}` : undefined,
    });
  }

  return { date, processed: games.length, settled: scores.length, results };
}

/** Run the live model for today. */
export async function runMorning(): Promise<RunResult> {
  const today = format(new Date(), 'yyyy-MM-dd');
  return runForDate(today, false);
}

/** Re-run model for today with updated lines (pregame), also settle recent dates. */
export async function runPregame(): Promise<{ today: RunResult; settled: string[] }> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const settled: string[] = [];

  // Settle last 3 days in case any scores were missing
  for (let i = 1; i <= 3; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const scores = await fetchGameScores(d);
    for (const s of scores) {
      const { rows } = await sql`
        SELECT p.id, p.line, p.direction FROM picks p
        JOIN games g ON p.game_id = g.id
        WHERE g.date = ${d} AND g.home_team = ${s.home_team} AND g.away_team = ${s.away_team}
        ORDER BY p.created_at DESC LIMIT 1`;
      if (!rows.length) continue;
      const p = rows[0];
      const actual = s.home_points + s.away_points;
      let result: 'win' | 'loss' | 'push' | 'no_bet' = 'no_bet';
      if (p.direction !== 'skip' && p.line !== null) {
        result = actual === p.line ? 'push'
          : p.direction === 'over' ? (actual > p.line ? 'win' : 'loss')
          : (actual < p.line ? 'win' : 'loss');
      }
      await updateResult({ pick_id: p.id, final_score_home: s.home_points, final_score_away: s.away_points, total: actual, result, entry_line: p.line, closing_line: null, clv: null });
      settled.push(d);
    }
  }

  // Auto-backfill last 7 days if picks are missing or stale (edge_count = 0)
  for (let i = 1; i <= 7; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const { rows } = await sql`
      SELECT p.id FROM picks p JOIN games g ON p.game_id = g.id
      WHERE g.date = ${d} AND p.edge_count > 0 LIMIT 1`;
    if (!rows.length) {
      // No picks with real edges for this date — run backfill
      try { await runForDate(d, true); } catch (e) { console.error(`Backfill ${d} failed:`, e); }
    }
  }

  const todayResult = await runForDate(today, false);
  return { today: todayResult, settled: [...new Set(settled)] };
}

/** Settle today's completed games (late-night cron). */
export async function runSettle(): Promise<{ date: string; settled: number }> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const scores = await fetchGameScores(today);
  let settled = 0;
  for (const s of scores) {
    const { rows } = await sql`
      SELECT p.id, p.line, p.direction FROM picks p
      JOIN games g ON p.game_id = g.id
      WHERE g.date = ${today} AND g.home_team = ${s.home_team} AND g.away_team = ${s.away_team}
      ORDER BY p.created_at DESC LIMIT 1`;
    if (!rows.length) continue;
    const p = rows[0];
    const actual = s.home_points + s.away_points;
    let result: 'win' | 'loss' | 'push' | 'no_bet' = 'no_bet';
    if (p.direction !== 'skip' && p.line !== null) {
      result = actual === p.line ? 'push'
        : p.direction === 'over' ? (actual > p.line ? 'win' : 'loss')
        : (actual < p.line ? 'win' : 'loss');
    }
    await updateResult({ pick_id: p.id, final_score_home: s.home_points, final_score_away: s.away_points, total: actual, result, entry_line: p.line, closing_line: null, clv: null });
    settled++;
  }
  return { date: today, settled };
}
