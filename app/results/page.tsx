import { getAllResults } from '@/lib/db/queries';
import { format, parseISO } from 'date-fns';
export const revalidate = 60;

export default async function ResultsPage() {
  let results: Awaited<ReturnType<typeof getAllResults>> = [];
  try { results = await getAllResults(); } catch {}

  const bets = results.filter(r => r.direction !== 'skip');
  const settled = bets.filter(r => r.result && r.result !== 'no_bet');
  const wins = settled.filter(r => r.result === 'win').length;
  const losses = settled.filter(r => r.result === 'loss').length;
  const avgClv = settled.length > 0
    ? (settled.reduce((s, r) => s + (Number(r.clv) || 0), 0) / settled.length).toFixed(2)
    : '--';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Results</h1>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Record', value: `${wins}-${losses}` },
          { label: 'Win %', value: settled.length > 0 ? `${((wins / settled.length) * 100).toFixed(1)}%` : '--' },
          { label: 'Avg CLV', value: avgClv },
          { label: 'Total Bets', value: String(bets.length) },
        ].map(s => (
          <div key={s.label} className="border border-gray-800 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-400 border-b border-gray-800">
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 pr-4">Matchup</th>
            <th className="pb-2 pr-4">Call</th>
            <th className="pb-2 pr-4">Line</th>
            <th className="pb-2 pr-4">Score</th>
            <th className="pb-2 pr-4">Total</th>
            <th className="pb-2 pr-4">Result</th>
            <th className="pb-2">CLV</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const isPending = !r.result;
            const isNobet = r.result === 'no_bet' || r.direction === 'skip';
            return (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                <td className="py-3 pr-4 text-gray-400">
                  {format(parseISO(String(r.date)), 'MMM d')}
                </td>
                <td className="py-3 pr-4">{r.away_team} @ {r.home_team}</td>
                <td className="py-3 pr-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    r.direction === 'over'  ? 'bg-green-900 text-green-300' :
                    r.direction === 'under' ? 'bg-blue-900 text-blue-300' :
                    'bg-gray-800 text-gray-400'}`}>
                    {String(r.direction).toUpperCase()}
                  </span>
                </td>
                <td className="py-3 pr-4">{r.line ?? '--'}</td>
                <td className="py-3 pr-4">
                  {r.final_score_away != null ? `${r.final_score_away}-${r.final_score_home}` : '--'}
                </td>
                <td className="py-3 pr-4">{r.total ?? '--'}</td>
                <td className="py-3 pr-4">
                  {isPending ? (
                    <span className="text-gray-500 italic">Pending</span>
                  ) : isNobet ? (
                    <span className="text-gray-400">No bet</span>
                  ) : (
                    <span className={`font-medium ${
                      r.result === 'win'  ? 'text-green-400' :
                      r.result === 'loss' ? 'text-red-400' :
                      'text-gray-400'}`}>
                      {String(r.result).charAt(0).toUpperCase() + String(r.result).slice(1)}
                    </span>
                  )}
                </td>
                <td className="py-3">
                  {r.clv != null ? `${Number(r.clv) > 0 ? '+' : ''}${r.clv}` : '--'}
                </td>
              </tr>
            );
          })}
          {results.length === 0 && (
            <tr><td colSpan={8} className="py-12 text-center text-gray-500">No picks yet. Run the model from the Admin page.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
