export default function ModelPage() {
  const edges = [
    {name:'Back-to-Back Fatigue',desc:'Team on 0 days rest -- pace suppression and shooting inefficiency.'},
    {name:'Travel Fatigue',desc:'Away team 2+ time zones with <=1 day rest.'},
    {name:'High-Impact Injury',desc:'Starter or 20+ PPG player OUT -- reduces expected scoring 5-8 pts.'},
    {name:'Pace Mismatch',desc:'Top-5 pace vs bottom-5 pace -- slow team sets tempo.'},
    {name:'Line Movement',desc:'Total moved 1.5+ pts against public flow -- sharp money other side.'},
    {name:'Rest Asymmetry',desc:'One team has 2+ more days rest.'},
    {name:'Venue Effect',desc:'Home/away scoring splits deviate significantly from team average.'},
    {name:'Defensive Matchup',desc:'Top-5 defense vs top-5 offense -- contested shots, slower pace.'},
    {name:'Historical Median',desc:'Total near historical median for this matchup -- regression target.'},
    {name:'Arena Factor',desc:'Elevation or unique arena factors.'},
    {name:'Stale Line + News',desc:'Line unchanged from open despite high-impact injury -- market inefficiency.'},
  ];
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Model Specification</h1>
      <p className="text-gray-400 mb-8 text-sm">11 structural edges. Min 2 aligned signals to bet. Bidirectional conflicts = skip.</p>
      <h2 className="text-lg font-semibold mb-4">The 11 Edges</h2>
      <div className="space-y-3 mb-10">{edges.map((e,i)=>(
        <div key={i} className="border border-gray-800 rounded-lg p-4 flex gap-4">
          <span className="text-gray-600 font-mono text-sm w-6 shrink-0">{String(i+1).padStart(2,'0')}</span>
          <div><div className="font-medium text-sm">{e.name}</div><div className="text-gray-400 text-sm mt-0.5">{e.desc}</div></div>
        </div>
      ))}</div>
      <h2 className="text-lg font-semibold mb-4">Sizing Guide</h2>
      <table className="w-full text-sm mb-10">
        <thead><tr className="text-left text-gray-400 border-b border-gray-800"><th className="pb-2 pr-6">Edges</th><th className="pb-2 pr-6">Bankroll %</th><th className="pb-2">Note</th></tr></thead>
        <tbody>{[['0-1','Skip','No bet'],['2','1-1.5%','Min unit'],['3','1.5-2.5%','Standard'],['4+','3%','Max unit']].map(([e,p,n])=>(
          <tr key={e} className="border-b border-gray-800/50"><td className="py-3 pr-6 font-mono">{e}</td><td className="py-3 pr-6 font-medium">{p}</td><td className="py-3 text-gray-400">{n}</td></tr>
        ))}</tbody>
      </table>
      <h2 className="text-lg font-semibold mb-4">Pre-Game Checklist</h2>
      <ul className="space-y-2 text-sm text-gray-300">{['Check final injury report (1hr before tip)',"Verify line hasn't moved >1.5 since morning",'Confirm back-to-back/rest data accurate','Check for late scratches','Still >=2 edges after pregame refresh'].map((t,i)=>(
        <li key={i} className="flex gap-2"><span className="text-gray-600">[]</span>{t}</li>
      ))}</ul>
    </div>
  );
}
