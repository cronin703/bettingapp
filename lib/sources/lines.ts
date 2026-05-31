import Anthropic from '@anthropic-ai/sdk';
export interface LinesData { total: number|null; spread: number|null; opening_line: number|null; }
const client = new Anthropic();

export async function fetchLines(home: string, away: string, date: string): Promise<LinesData> {
  const empty: LinesData = { total: null, spread: null, opening_line: null };
  try {
    const r = await client.messages.create({
      model: 'claude-opus-4-8', max_tokens: 600,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 } as never],
      messages: [{ role: 'user', content:
        `Search for the current WNBA betting lines for ${away} at ${home} on ${date}. ` +
        `Find the over/under total points line and the point spread. ` +
        `After searching, reply with ONLY this JSON inside a \`\`\`json block — no other text:\n` +
        `\`\`\`json\n{"total":NUMBER_OR_NULL,"spread":NUMBER_OR_NULL,"opening_line":NUMBER_OR_NULL}\n\`\`\``
      }],
    });

    const text = r.content
      .filter(c => c.type === 'text')
      .map(c => (c as { text: string }).text)
      .join('\n');

    // 1. Try fenced ```json block
    const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (fenced) {
      try { return { ...empty, ...JSON.parse(fenced[1]) }; } catch { /* fall through */ }
    }

    // 2. Try any { } object
    const obj = text.match(/\{[^{}]*"total"[^{}]*\}/);
    if (obj) {
      try { return { ...empty, ...JSON.parse(obj[0]) }; } catch { /* fall through */ }
    }

    // 3. Scrape total number from phrases like "o/u 162.5" or "total of 162.5"
    const totalMatch = text.match(/(?:over[\s/]under|o\/u|total(?:\s+of)?)[:\s]+(\d{2,3}(?:\.\d)?)/i);
    if (totalMatch) return { ...empty, total: parseFloat(totalMatch[1]) };

    return empty;
  } catch { return empty; }
}
