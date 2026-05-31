/**
 * Runs once on server startup (including every Vercel deployment).
 * Ensures today's picks exist and backfills any recent dates with stale/missing data.
 */
export async function register() {
  // Only run on the Node.js runtime, not edge
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Delay slightly to let the DB connection pool warm up
  await new Promise(r => setTimeout(r, 2000));

  try {
    const { runMorning, runForDate } = await import('@/lib/model/runner');
    const { sql } = await import('@vercel/postgres');
    const { format, subDays } = await import('date-fns');

    const today = format(new Date(), 'yyyy-MM-dd');

    // 1. Check if today already has picks with real edges
    const { rows: todayRows } = await sql`
      SELECT p.id FROM picks p JOIN games g ON p.game_id = g.id
      WHERE g.date = ${today} AND p.edge_count > 0 LIMIT 1`;

    if (!todayRows.length) {
      console.log('[startup] No picks for today — running morning model...');
      await runMorning();
    }

    // 2. Backfill last 7 days where picks are missing or stale (edge_count = 0)
    for (let i = 1; i <= 7; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const { rows } = await sql`
        SELECT p.id FROM picks p JOIN games g ON p.game_id = g.id
        WHERE g.date = ${d} AND p.edge_count > 0 LIMIT 1`;
      if (!rows.length) {
        console.log(`[startup] Stale/missing picks for ${d} — running backfill...`);
        try { await runForDate(d, true); } catch (e) { console.error(`[startup] Backfill ${d} failed:`, e); }
      }
    }

    console.log('[startup] Model initialization complete.');
  } catch (e) {
    console.error('[startup] Initialization error:', e);
  }
}
