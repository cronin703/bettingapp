import type { Game } from '@/lib/types';
const BASE = 'https://api.sportradar.com/wnba/trial/v8/en';
interface SRGame { home_team:string; away_team:string; scheduled:string; home_points?:number; away_points?:number; status:string; }
export async function fetchTodaysSchedule(date: string): Promise<Omit<Game,'id'|'created_at'>[]> {
  const key = process.env.SPORTRADAR_API_KEY;
  if (!key) return [];
  const [y,m,d] = date.split('-');
  try {
    const res = await fetch(`${BASE}/games/${y}/${m}/${d}/schedule.json?api_key=${key}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.games??[]).map((g:SRGame) => ({ date, home_team:g.home_team, away_team:g.away_team, tipoff_time:g.scheduled, status:g.status==='closed'?'final':g.status==='inprogress'?'in_progress':'scheduled' }));
  } catch { return []; }
}
export async function fetchGameScores(date: string): Promise<Array<{home_team:string;away_team:string;home_points:number;away_points:number}>> {
  const key = process.env.SPORTRADAR_API_KEY;
  if (!key) return [];
  const [y,m,d] = date.split('-');
  try {
    const res = await fetch(`${BASE}/games/${y}/${m}/${d}/summary.json?api_key=${key}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.games??[]).filter((g:SRGame)=>g.status==='closed').map((g:SRGame) => ({ home_team:g.home_team, away_team:g.away_team, home_points:g.home_points??0, away_points:g.away_points??0 }));
  } catch { return []; }
}
