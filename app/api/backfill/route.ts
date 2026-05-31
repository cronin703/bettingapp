import { NextRequest, NextResponse } from 'next/server';
import { fetchTodaysSchedule, fetchGameScores } from '@/lib/sources/scores';
import { fetchLines } from '@/lib/sources/lines';
import { fetchInjuries } from '@/lib/sources/injuries';
import { fetchScheduleContext } from '@/lib/sources/schedule-context';
import { runModel } from '@/lib/model/engine';
import { upsertGame, upsertPick, updateResult } from '@/lib/db/queries';
import type { GameInput } from '@/lib/types';

function auth(req: NextRequest) {
  const s = process.env.CRON_SECRET;
  return s && req.headers.get('authorization') === `Bearer ${s}`;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const date = req.nextUrl.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 });

  try {
    const [games, scores] = await Promise.all([
      fetchTodaysSchedule(date),
      fetchGameScores(date),
    ]);

    const results = [];
    for (const game of games) {
      const gameId = await upsertGame({ ...game, status: 'final' });
      const [lines, hi, ai, sched] = await Promise.all([
        fetchLines(game.home_team, game.away_team, date),
        fetchInjuries(game.home_team, date),
        fetchInjuries(game.away_team, date),
        fetchScheduleContext(game.home_team, game.away_team, date),
      ]);
      const input: GameInput = {
        home_team: game.home_team, away_team: game.away_team, date, tipoff_time: game.tipoff_time,
        line: lines.spread, total: lines.total, opening_line: lines.opening_line,
        injuries: [...hi, ...ai], pace_differential: null, schedule_context: sched,
      };
      const out = runModel(input);
      const pickId = await upsertPick({
        game_id: gameId, direction: out.direction, edge_count: out.edge_count,
        edges_fired: out.edges_fired, line: lines.total, model_call: out.reasoning,
        sizing: out.sizing, run_type: 'morning',
      });

      // Match final score
      const score = scores.find(s =>
        s.home_team === game.home_team && s.away_team === game.away_team
      );
      if (score) {
        const finalTotal = score.home_points + score.away_points;
        let result: 'win' | 'loss' | 'push' | 'no_bet' = 'no_bet';
        if (out.direction !== 'skip' && lines.total !== null) {
          if (finalTotal > lines.total) result = out.direction === 'over' ? 'win' : 'loss';
          else if (finalTotal < lines.total) result = out.direction === 'under' ? 'win' : 'loss';
          else result = 'push';
        }
        await updateResult({
          pick_id: pickId, final_score_home: score.home_points, final_score_away: score.away_points,
          total: finalTotal, result, entry_line: lines.total, closing_line: lines.total, clv: null,
        });
      }

      results.push({
        game: `${game.away_team} @ ${game.home_team}`,
        direction: out.direction, edges: out.edge_count,
        score: score ? `${score.home_points}-${score.away_points}` : 'N/A',
      });
    }
    return NextResponse.json({ date, processed: results.length, results });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}
