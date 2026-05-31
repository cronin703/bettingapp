import { NextRequest, NextResponse } from 'next/server';
import { runForDate } from '@/lib/model/runner';

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
    const result = await runForDate(date, true);
    return NextResponse.json(result);
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}
