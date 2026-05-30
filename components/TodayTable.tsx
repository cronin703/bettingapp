'use client';
import { useState } from 'react';
import { format } from 'date-fns';
interface Pick { away_team:string; home_team:string; tipoff_time:string; line:number|null; direction:string; edge_count:number; edges_fired:string[]; sizing:number; model_call:string|null; }
export default function TodayTable({ picks }: { picks: Pick[] }) {
  const [exp, setExp] = useState<number|null>(null);
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-left text-gray-400 border-b border-gray-800">
        <th className="pb-2 pr-4">Matchup</th><th className="pb-2 pr-4">Tipoff</th>
        <th className="pb-2 pr-4">Total</th><th className="pb-2 pr-4">Call</th>
        <th className="pb-2 pr-4">Edges</th><th className="pb-2">Size</th>
      </tr></thead>
      <tbody>{picks.map((p,i) => (<>
        <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-900/30 cursor-pointer" onClick={()=>setExp(exp===i?null:i)}>
          <td className="py-3 pr-4">{p.away_team} @ {p.home_team}</td>
          <td className="py-3 pr-4 text-gray-400">{format(new Date(p.tipoff_time),'h:mm a')}</td>
          <td className="py-3 pr-4">{p.line??'--'}</td>
          <td className="py-3 pr-4"><span className={`px-2 py-0.5 rounded text-xs font-medium ${p.direction==='over'?'bg-green-900 text-green-300':p.direction==='under'?'bg-blue-900 text-blue-300':'bg-gray-800 text-gray-400'}`}>{p.direction.toUpperCase()}</span></td>
          <td className="py-3 pr-4">{p.edge_count}</td>
          <td className="py-3">{p.sizing>0?`${p.sizing}%`:'--'}</td>
        </tr>
        {exp===i&&(<tr key={`${i}x`} className="border-b border-gray-800"><td colSpan={6} className="py-3 px-2 bg-gray-900/50">
          <div className="flex flex-wrap gap-1 mb-2">{(p.edges_fired??[]).map(e=><span key={e} className="px-2 py-0.5 bg-gray-800 rounded text-xs">{e}</span>)}</div>
          {p.model_call&&<p className="text-xs text-gray-300">{p.model_call}</p>}
        </td></tr>)}
      </>))}</tbody>
    </table>
  );
}
