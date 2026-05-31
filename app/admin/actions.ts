'use server';

const BASE = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

async function callEndpoint(path: string) {
  const secret = process.env.CRON_SECRET;
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: 'no-store',
  });
  return res.json();
}

export async function runMorning() {
  return callEndpoint('/api/cron/morning');
}

export async function runPregame() {
  return callEndpoint('/api/cron/pregame');
}

export async function runSettle() {
  return callEndpoint('/api/cron/settle');
}

export async function runBackfill(date: string) {
  return callEndpoint(`/api/backfill?date=${date}`);
}
