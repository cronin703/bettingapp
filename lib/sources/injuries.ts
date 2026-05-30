import Anthropic from 'anthropic';
import type { InjuryReport } from '@/lib/types';
const client = new Anthropic();
export async function fetchInjuries(team: string, date: string): Promise<InjuryReport[]> {
  try {
    const r = await client.messages.create({
      model: 'claude-opus-4-8', max_tokens: 1024,
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as never],
      messages: [{ role: 'user', content: `WNBA injury report for ${team} on ${date}. Return ONLY JSON array: [{"player":string,"status":"out"|"questionable"|"probable","position":string,"impact_level":"high"|"medium"|"low"}]. High=starter/20+PPG.` }],
    });
    const t = r.content.find(c => c.type==='text');
    if (!t || t.type!=='text') return [];
    const m = t.text.match(/\[[\s\S]*\]/);
    if (!m) return [];
    return (JSON.parse(m[0]) as Array<Omit<InjuryReport,'team'>>).map(p => ({ ...p, team }));
  } catch { return []; }
}
