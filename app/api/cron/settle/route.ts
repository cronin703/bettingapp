import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { fetchGameScores } from '@/lib/sources/scores';
import { updateResult } from '@/lib/db/queries';
import { sql } from '@vercel/postgres';

function auth(req: NextRequest) {
  const s = process.env.CRON_SECRET;
  return s && req.headers.get('authorization') === `Bearer ${s}`;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const today = format(new Date(), 'yyyy-MM-dd');
  try {
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
    return NextResponse.json({ date: today, settled });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}
