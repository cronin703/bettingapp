import { getCLVLog } from '@/lib/db/queries';
import CLVChart from '@/components/CLVChart';
export const revalidate = 3600;
export default async function CLVPage() {
  let data: Awaited<ReturnType<typeof getCLVLog>> = [];
  try { data = await getCLVLog(); } catch {}
  const totalBets = data.reduce((s,d)=>s+d.bets_placed,0);
  const totalWins = data.reduce((s,d)=>s+d.wins,0);
  const clvPts = data.filter(d=>d.avg_clv!==null);
  const avgCLV = clvPts.length>0?(clvPts.reduce((s,d)=>s+(d.avg_clv??0),0)/clvPts.length).toFixed(2):'--';
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">CLV Tracker</h1>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[{label:'Total Bets',value:String(totalBets)},{label:'Win Rate',value:totalBets>0?`${((totalWins/totalBets)*100).toFixed(1)}%`:'--'},{label:'Avg CLV',value:avgCLV!=='--'?`+${avgCLV}`:'--'},{label:'Days Tracked',value:String(data.length)}].map(s=>(
          <div key={s.label} className="border border-gray-800 rounded-lg p-4"><div className="text-xs text-gray-400 mb-1">{s.label}</div><div className="text-2xl font-bold">{s.value}</div></div>
        ))}
      </div>
      <div className="border border-gray-800 rounded-lg p-6">
        <h2 className="text-sm font-medium text-gray-400 mb-4">CLV Over Time</h2>
        <CLVChart data={data.slice().reverse()}/>
      </div>
    </div>
  );
}
