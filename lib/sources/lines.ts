import Anthropic from '@anthropic-ai/sdk';
export interface LinesData { total: number|null; spread: number|null; opening_line: number|null; }
const client = new Anthropic();
export async function fetchLines(home: string, away: string, date: string): Promise<LinesData> {
  try {
    const r = await client.messages.create({
      model: 'claude-opus-4-8', max_tokens: 512,
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as never],
      messages: [{ role: 'user', content: `WNBA betting lines for ${away} vs ${home} on ${date}. Return ONLY JSON: {"total":number|null,"spread":number|null,"opening_line":number|null}` }],
    });
    const t = r.content.find(c => c.type==='text');
    if (!t || t.type!=='text') return { total:null, spread:null, opening_line:null };
    const m = t.text.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : { total:null, spread:null, opening_line:null };
  } catch { return { total:null, spread:null, opening_line:null }; }
}
