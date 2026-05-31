import Anthropic from '@anthropic-ai/sdk';
import type { ScheduleContext } from '@/lib/types';

const client = new Anthropic();

export async function fetchScheduleContext(home: string, away: string, date: string): Promise<ScheduleContext> {
  const defaults: ScheduleContext = { home_days_rest: 2, away_days_rest: 2, home_travel: false, away_travel: false, home_back_to_back: false, away_back_to_back: false };
  try {
    const r = await client.messages.create({
      model: 'claude-opus-4-8', max_tokens: 512,
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as never],
      messages: [{ role: 'user', content: `WNBA schedule context for ${away} at ${home} on ${date}. Search the WNBA schedule to find when each team last played. Return ONLY JSON: {"home_days_rest":number,"away_days_rest":number,"home_travel":boolean,"away_travel":boolean,"home_back_to_back":boolean,"away_back_to_back":boolean}. back_to_back=true if played yesterday. travel=true if away team traveled >500 miles.` }],
    });
    const t = r.content.find(c => c.type === 'text');
    if (!t || t.type !== 'text') return defaults;
    const m = t.text.match(/\{[\s\S]*\}/);
    if (!m) return defaults;
    return { ...defaults, ...JSON.parse(m[0]) };
  } catch { return defaults; }
}
