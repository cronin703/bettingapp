import { getTodaysPicks } from '@/lib/db/queries';
import { runMorning } from '@/lib/model/runner';
import { format } from 'date-fns';
import TodayTable from '@/components/TodayTable';
export const revalidate = 60;

export default async function TodayPage() {
  let picks = await getTodaysPicks().catch(() => []);

  // Self-heal: if no picks yet today, run the model now before rendering
  if (picks.length === 0) {
    try { await runMorning(); } catch {}
    picks = await getTodaysPicks().catch(() => []);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Today's Picks</h1>
        <span className="text-sm text-gray-400">Updated {format(new Date(), 'h:mm a')}</span>
      </div>
      {picks.length === 0
        ? <div className="text-gray-400 text-center py-20 border border-gray-800 rounded-lg">No games scheduled today.</div>
        : <TodayTable picks={picks as never} />}
    </div>
  );
}
