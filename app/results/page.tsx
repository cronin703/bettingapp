import { getAllResults } from '@/lib/db/queries';
import { format } from 'date-fns';
export const revalidate = 3600;
export default async function ResultsPage() {
  let results: Awaited<ReturnType<typeof getAllResults>> = [];
  try { results = await getAllResults(); } catch {}
  const bets = results.filter(r=>r.direction!=='skip');
  const wins = bets.filter(r=>r.result==='win').length;
  const losses = bets.filter(r=>r.result==='loss').length;
  const avgClv = bets.length>0?(bets.reduce((s,r)=>s+(r.clv??0),0)/bets.length).toFixed(2):'--';
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Results</h1>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[{label:'Record',value:`${wins}-${losses}`},{label:'Win %',value:bets.length>0?`${((wins/bets.length)*100).toFixed(1)}%`:'--'},{label:'Avg CLV',value:avgClv},{label:'Total Bets',value:String(bets.length)}].map(s=>(
          <div key={s.label} className="border border-gray-800 rounded-lg p-4"><div className="text-xs text-gray-400 mb-1">{s.label}</div><div className="text-2xl font-bold">{s.value}</div></div>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-400 border-b border-gray-800">
          <th className="pb-2 pr-4">Date</th><th className="pb-2 pr-4">Matchup</th><th className="pb-2 pr-4">Call</th>
          <th className="pb-2 pr-4">Line</th><th className="pb-2 pr-4">Score</th><th className="pb-2 pr-4">Total</th>
          <th className="pb-2 pr-4">Result</th><th className="pb-2">CLV</th>
        </tr></thead>
        <tbody>{results.map((r,i)=>(
          <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-900/30">
            <td className="py-3 pr-4 text-gray-400">{format(new Date(r.date),'MMM d')}</td>
            <td className="py-3 pr-4">{r.away_team} @ {r.home_team}</td>
            <td className="py-3 pr-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${r.direction==='over'?'bg-green-900 text-green-300':r.direction==='under'?'bg-blue-900 text-blue-300':'bg-gray-800 text-gray-400'}`}>{String(r.direction).toUpperCase()}</span></td>
            <td className="py-3 pr-4">{r.line??'--'}</td>
            <td className="py-3 pr-4">{r.final_score_away??'?'}-{r.final_score_home??'?'}</td>
            <td className="py-3 pr-4">{r.total??'--'}</td>
            <td className="py-3 pr-4"><span className={`font-medium ${r.result==='win'?'text-green-400':r.result==='loss'?'text-red-400':'text-gray-400'}`}>{r.result?String(r.result).charAt(0).toUpperCase()+String(r.result).slice(1):'--'}</span></td>
            <td className="py-3">{r.clv!=null?`${Number(r.clv)>0?'+':''}${r.clv}`:'--'}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
