import Anthropic from '@anthropic-ai/sdk';
import type { Game } from '@/lib/types';

const BASE = 'https://api.sportradar.com/wnba/trial/v8/en';

interface SRGame { home_team:string; away_team:string; scheduled:string; home_points?:number; away_points?:number; status:string; }

export async function fetchTodaysSchedule(date: string): Promise<Omit<Game,'id'|'created_at'>[]> {
  const key = process.env.SPORTRADAR_API_KEY;
  if (key) {
    const [y, m, d] = date.split('-');
    try {
      const res = await fetch(`${BASE}/games/${y}/${m}/${d}/schedule.json?api_key=${key}`);
      if (res.ok) {
        const data = await res.json();
        if (data.games?.length) return data.games.map((g: SRGame) => ({
          date, home_team: g.home_team, away_team: g.away_team,
          tipoff_time: g.scheduled,
          status: (g.status === 'closed' ? 'final' : g.status === 'inprogress' ? 'in_progress' : 'scheduled') as Game['status'],
        }));
      }
    } catch (e) { console.error('SportsRadar error:', e); }
  }
  try {
    const client = new Anthropic();
    console.log('Fetching WNBA schedule via web search for', date);
    const r = await client.messages.create({
      model: 'claude-opus-4-8', max_tokens: 1024,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
      messages: [{ role: 'user', content: `What WNBA games are scheduled for ${date}? List every game. Return ONLY a JSON array: [{"home_team":string,"away_team":string,"tipoff_time":"${date}THH:MM:00Z"}]. If no games, return [].` }],
    });
    const t = r.content.find(c => c.type === 'text');
    if (t && t.type === 'text') {
      console.log('Web search response:', t.text.slice(0, 300));
      const m = t.text.match(/\[[\s\S]*?\]/);
      if (m) {
        const games = JSON.parse(m[0]) as Array<{ home_team: string; away_team: string; tipoff_time: string }>;
        return games.map(g => ({ date, home_team: g.home_team, away_team: g.away_team, tipoff_time: g.tipoff_time, status: 'scheduled' as const }));
      }
    }
  } catch (e) { console.error('webSearchSchedule error:', e); }
  return [];
}

export async function fetchGameScores(date: string): Promise<Array<{ home_team: string; away_team: string; home_points: number; away_points: number }>> {
  const key = process.env.SPORTRADAR_API_KEY;
  if (key) {
    const [y, m, d] = date.split('-');
    try {
      const res = await fetch(`${BASE}/games/${y}/${m}/${d}/summary.json?api_key=${key}`);
      if (res.ok) {
        const data = await res.json();
        return (data.games ?? []).filter((g: SRGame) => g.status === 'closed').map((g: SRGame) => ({ home_team: g.home_team, away_team: g.away_team, home_points: g.home_points ?? 0, away_points: g.away_points ?? 0 }));
      }
    } catch (e) { console.error('SportsRadar scores error:', e); }
  }
  try {
    const client = new Anthropic();
    const r = await client.messages.create({
      model: 'claude-opus-4-8', max_tokens: 1024,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
      messages: [{ role: 'user', content: `What were the final scores of WNBA games played on ${date}? Return ONLY a JSON array: [{"home_team":string,"away_team":string,"home_points":number,"away_points":number}]. If none final, return [].` }],
    });
    const t = r.content.find(c => c.type === 'text');
    if (t && t.type === 'text') {
      const m = t.text.match(/\[[\s\S]*?\]/);
      if (m) return JSON.parse(m[0]);
    }
  } catch (e) { console.error('webScores error:', e); }
  return [];
}