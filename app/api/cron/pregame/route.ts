import { NextRequest, NextResponse } from 'next/server';
import { runPregame, runSettle } from '@/lib/model/runner';

function auth(req: NextRequest) {
  const s = process.env.CRON_SECRET;
  return s && req.headers.get('authorization') === `Bearer ${s}`;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    // Run settle first (scores from last night), then pregame (today's picks + backfill)
    const settle = await runSettle().catch(e => ({ error: String(e) }));
    const pregame = await runPregame();
    return NextResponse.json({ settle, pregame });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}
