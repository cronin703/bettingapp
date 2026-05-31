import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { fetchTodaysSchedule } from '@/lib/sources/scores';
import { fetchInjuries } from '@/lib/sources/injuries';
import { fetchGameContext } from '@/lib/sources/game-context';
import { runModel } from '@/lib/model/engine';
import { upsertGame, upsertPick } from '@/lib/db/queries';
import type { FullGameInput } from '@/lib/model/engine';

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
      await upsertPick({
        game_id: gameId, direction: out.direction, edge_count: out.edge_count,
        edges_fired: out.edges_fired, line: total, model_call: out.reasoning,
        sizing: out.sizing, run_type: 'morning',
      });
      results.push({ game: `${game.away_team} @ ${game.home_team}`, direction: out.direction, edges: out.edge_count });
    }
    return NextResponse.json({ date: today, processed: results.length, results });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}
