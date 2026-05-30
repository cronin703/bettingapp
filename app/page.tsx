import { getTodaysPicks } from '@/lib/db/queries';
import { format } from 'date-fns';
import TodayTable from '@/components/TodayTable';
export const revalidate = 1800;
export default async function TodayPage() {
  let picks: Awaited<ReturnType<typeof getTodaysPicks>> = [];
  try { picks = await getTodaysPicks(); } catch {}
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Today's Picks</h1>
        <span className="text-sm text-gray-400">Updated {format(new Date(),'h:mm a')}</span>
      </div>
      {picks.length===0
        ? <div className="text-gray-400 text-center py-20 border border-gray-800 rounded-lg">No picks yet. Model runs at 9 AM and 5 PM ET.</div>
        : <TodayTable picks={picks}/>}
    </div>
  );
}
