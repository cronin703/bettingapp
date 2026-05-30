'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
interface P { date:string; avg_clv:number|null; }
export default function CLVChart({ data }: { data: P[] }) {
  if (!data.length) return <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No CLV data yet</div>;
  const d = data.map(x=>({ date:format(new Date(x.date),'MMM d'), clv:x.avg_clv }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={d} margin={{top:5,right:20,bottom:5,left:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937"/>
        <XAxis dataKey="date" tick={{fill:'#6b7280',fontSize:11}}/>
        <YAxis tick={{fill:'#6b7280',fontSize:11}}/>
        <Tooltip contentStyle={{background:'#111827',border:'1px solid #374151',borderRadius:6}} labelStyle={{color:'#9ca3af'}} itemStyle={{color:'#e5e7eb'}}/>
        <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 4"/>
        <Line type="monotone" dataKey="clv" stroke="#60a5fa" strokeWidth={2} dot={false}/>
      </LineChart>
    </ResponsiveContainer>
  );
}
