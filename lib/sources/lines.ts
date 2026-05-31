import Anthropic from '@anthropic-ai/sdk';
export interface LinesData { total: number|null; spread: number|null; opening_line: number|null; }
const client = new Anthropic();
export async function fetchLines(home: string, away: string, date: string): Promise<LinesData> {
  const empty = { total:null, spread:null, opening_line:null };
  try {
    const r = await client.messages.create({
      model: 'claude-opus-4-8', max_tokens: 512,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 } as never],
      messages: [{ role: 'user', content: `Search for current WNBA betting lines for ${away} at ${home} on ${date}. Find the over/under total and point spread. Respond with ONLY a JSON object inside a \`\`\`json code block: {"total":number|null,"spread":number|null,"opening_line":number|null}` }],
    });
    const texts = r.content.filter(c => c.type === 'text').map(c => (c as {text:string}).text).join('\n');
    // Try fenced block first
    const fenced = texts.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const raw = fenced ? fenced[1] : (texts.match(/\{[\s\S]*?\}/) ?? [])[0];
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch { return empty; }
}
