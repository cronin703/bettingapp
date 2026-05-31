import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { fetchTodaysSchedule, fetchGameScores } from '@/lib/sources/scores';
import { fetchInjuries } from '@/lib/sources/injuries';
import { fetchGameContext } from '@/lib/sources/game-context';
import { runModel } from '@/lib/model/engine';
import { upsertGame, upsertPick, updateResult } from '@/lib/db/queries';
import { sql } from '@vercel/postgres';
import type { FullGameInput } from '@/lib/model/engine';

function auth(req: NextRequest) {
  const s = process.env.CRON_SECRET;
  return s && req.headers.get('authorization') === `Bearer ${s}`;
}

async function settleDate(date: string) {
  const scores = await fetchGameScores(date);
  let settled = 0;
  for (const s of scores) {
    const { rows } = await sql`
      SELECT p.id, p.line, p.direction FROM picks p
      JOIN games g ON p.game_id = g.id
      WHERE g.date = ${date} AND g.home_team = ${s.home_team} AND g.away_team = ${s.away_team}
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
  return settled;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  try {
    const [yday, tday] = await Promise.all([settleDate(yesterday), settleDate(today)]);
    const games = await fetchTodaysSchedule(today);
    const results = [];
    for (const game of games) {
      const gameId = await upsertGame(game);
      const [context, hi, ai] = await Promise.all([
        fetchGameContext(game.home_team, game.away_team, today),
        fetchInjuries(game.home_team, today),
        fetchInjuries(game.away_team, today),
      ]);
      const input: FullGameInput = {
        home_team: game.home_team, away_team: game.away_team,
        date: today, tipoff_time: game.tipoff_time,
        context, injuries: [...hi, ...ai],
      };
      const out = runModel(input);
      const total = context.current_total ?? context.opening_total ?? null;
      await upsertPick({ game_id: gameId, direction: out.direction, edge_count: out.edge_count, edges_fired: out.edges_fired, line: total, model_call: out.reasoning, sizing: out.sizing, run_type: 'pregame' });
      results.push({ game: `${game.away_team} @ ${game.home_team}`, direction: out.direction, edges: out.edge_count });
    }
    return NextResponse.json({ date: today, yesterday_settled: yday, today_settled: tday, pregame_picks: results.length, results });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}
