import { NextRequest, NextResponse } from 'next/server';
import { runMorning } from '@/lib/model/runner';

function auth(req: NextRequest) {
  const s = process.env.CRON_SECRET;
  return s && req.headers.get('authorization') === `Bearer ${s}`;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runMorning();
    return NextResponse.json(result);
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}
