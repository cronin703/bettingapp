import Anthropic from '@anthropic-ai/sdk';
import type { Game } from '@/lib/types';

const BASE = 'https://api.sportradar.com/wnba/trial/v8/en';

interface SRGame { home_team:string; away_team:string; scheduled:string; home_points?:number; away_points?:number; status:string; }

// Robustly extract a JSON array from model text that may include
// markdown code fences and explanatory prose around it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractJsonArray(text: string): any[] | null {
  // 1. Prefer a fenced ```json ... ``` block
  const fenced = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  const candidate = fenced ? fenced[1] : null;
  if (candidate) {
    try { return JSON.parse(candidate); } catch { /* fall through */ }
  }
  // 2. Otherwise grab the largest [ ... ] span (greedy) and try parsing
  const greedy = text.match(/\[[\s\S]*\]/);
  if (greedy) {
    try { return JSON.parse(greedy[0]); } catch { /* fall through */ }
  }
  return null;
}

async function webSearch(prompt: string): Promise<string | null> {
  const client = new Anthropic();
  const r = await client.messages.create({
    model: 'claude-opus-4-8', max_tokens: 1500,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 } as any],
    messages: [{ role: 'user', content: prompt }],
  });
  const texts = r.content.filter(c => c.type === 'text').map(c => (c as { text: string }).text);
  return texts.length ? texts.join('\n') : null;
}

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
    const text = await webSearch(`What WNBA games are scheduled for ${date}? Search the web for the schedule, then respond with ONLY a JSON array inside a \`\`\`json code block. Format: [{"home_team":string,"away_team":string,"tipoff_time":"${date}THH:MM:00Z"}]. Use 00:00 for the time if unknown. If there are no games, return [].`);
    if (text) {
      const games = extractJsonArray(text) as Array<{ home_team: string; away_team: string; tipoff_time: string }> | null;
      if (games) return games.map(g => ({ date, home_team: g.home_team, away_team: g.away_team, tipoff_time: g.tipoff_time || `${date}T00:00:00Z`, status: 'scheduled' as const }));
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
    const text = await webSearch(`What were the final scores of WNBA games played on ${date}? Search the web, then respond with ONLY a JSON array inside a \`\`\`json code block. Format: [{"home_team":string,"away_team":string,"home_points":number,"away_points":number}]. If no games were final, return [].`);
    if (text) {
      const scores = extractJsonArray(text);
      if (scores) return scores;
    }
  } catch (e) { console.error('webScores error:', e); }
  return [];
}
