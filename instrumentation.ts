/**
 * Server startup hook. Kept intentionally lightweight — heavy model runs
 * during this hook can block Next.js static page generation at build/deploy
 * time and cause timeouts. Self-healing is handled by the Today page and
 * the cron-triggered runner instead.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
}
