import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { fetchTodaysSchedule } from '@/lib/sources/scores';
import { fetchLines } from '@/lib/sources/lines';
import { fetchInjuries } from '@/lib/sources/injuries';
import { fetchScheduleContext } from '@/lib/sources/schedule-context';
import { runModel } from '@/lib/model/engine';
import { upsertGame, upsertPick } from '@/lib/db/queries';
import type { GameInput } from '@/lib/types';

function auth(req: NextRequest) {
  const s = process.env.CRON_SECRET;
  return s && req.headers.get('authorization') === `Bearer ${s}`;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const today = format(new Date(), 'yyyy-MM-dd');
  try {
    const games = await fetchTodaysSchedule(today);
    const results = [];
    for (const game of games) {
      const gameId = await upsertGame(game);
      const [lines, hi, ai, sched] = await Promise.all([fetchLines(game.home_team, game.away_team, today), fetchInjuries(game.home_team, today), fetchInjuries(game.away_team, today), fetchScheduleContext(game.home_team, game.away_team, today)]);
      const input: GameInput = { home_team:game.home_team, away_team:game.away_team, date:today, tipoff_time:game.tipoff_time, line:lines.spread, total:lines.total, opening_line:lines.opening_line, injuries:[...hi,...ai], pace_differential:null, schedule_context:sched };
      const out = runModel(input);
      await upsertPick({ game_id:gameId, direction:out.direction, edge_count:out.edge_count, edges_fired:out.edges_fired, line:lines.total, model_call:out.reasoning, sizing:out.sizing, run_type:'morning' });
      results.push({ game:`${game.away_team} @ ${game.home_team}`, direction:out.direction, edges:out.edge_count });
    }
    return NextResponse.json({ date:today, processed:results.length, results });
  } catch (err) { return NextResponse.json({ error:String(err) }, { status:500 }); }
}
