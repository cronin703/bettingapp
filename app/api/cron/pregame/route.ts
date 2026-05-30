import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { fetchTodaysSchedule, fetchGameScores } from '@/lib/sources/scores';
import { fetchLines } from '@/lib/sources/lines';
import { fetchInjuries } from '@/lib/sources/injuries';
import { runModel } from '@/lib/model/engine';
import { upsertGame, upsertPick, updateResult } from '@/lib/db/queries';
import { sql } from '@vercel/postgres';
import type { GameInput } from '@/lib/types';

function auth(req: NextRequest) {
  const s = process.env.CRON_SECRET;
  return s && req.headers.get('authorization') === `Bearer ${s}`;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  try {
    const scores = await fetchGameScores(yesterday);
    for (const s of scores) {
      const { rows } = await sql`SELECT p.id, p.line, p.direction FROM picks p JOIN games g ON p.game_id=g.id WHERE g.date=${yesterday} AND g.home_team=${s.home_team} AND g.away_team=${s.away_team} ORDER BY p.created_at DESC LIMIT 1`;
      if (rows.length > 0) {
        const p = rows[0]; const actual = s.home_points + s.away_points;
        let result: 'win'|'loss'|'push'|'no_bet' = 'no_bet';
        if (p.direction !== 'skip' && p.line !== null) {
          result = actual === p.line ? 'push' : p.direction === 'over' ? (actual > p.line ? 'win' : 'loss') : (actual < p.line ? 'win' : 'loss');
        }
        await updateResult({ pick_id:p.id, final_score_home:s.home_points, final_score_away:s.away_points, total:actual, result, entry_line:p.line, closing_line:null, clv:null });
      }
    }
    const games = await fetchTodaysSchedule(today);
    const results = [];
    for (const game of games) {
      const gameId = await upsertGame(game);
      const [lines, hi, ai] = await Promise.all([fetchLines(game.home_team, game.away_team, today), fetchInjuries(game.home_team, today), fetchInjuries(game.away_team, today)]);
      const input: GameInput = { home_team:game.home_team, away_team:game.away_team, date:today, tipoff_time:game.tipoff_time, line:lines.spread, total:lines.total, opening_line:lines.opening_line, injuries:[...hi,...ai], pace_differential:null, schedule_context:{home_days_rest:1,away_days_rest:1,home_travel:false,away_travel:false,home_back_to_back:false,away_back_to_back:false} };
      const out = runModel(input);
      await upsertPick({ game_id:gameId, direction:out.direction, edge_count:out.edge_count, edges_fired:out.edges_fired, line:lines.total, model_call:out.reasoning, sizing:out.sizing, run_type:'pregame' });
      results.push({ game:`${game.away_team} @ ${game.home_team}`, direction:out.direction, edges:out.edge_count });
    }
    return NextResponse.json({ date:today, yesterday_results_updated:scores.length, pregame_picks:results.length, results });
  } catch (err) { return NextResponse.json({ error:String(err) }, { status:500 }); }
}
