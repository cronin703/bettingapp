import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const debug: Record<string, unknown> = {
    date,
    has_anthropic_key: !!process.env.ANTHROPIC_API_KEY,
    has_postgres_url: !!process.env.POSTGRES_URL,
    has_cron_secret: !!process.env.CRON_SECRET,
    has_sportradar_key: !!process.env.SPORTRADAR_API_KEY,
  };

  try {
    const client = new Anthropic();
    const r = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 } as any],
      messages: [{ role: 'user', content: `What WNBA games are scheduled for ${date}? List every game. Return ONLY a JSON array: [{"home_team":string,"away_team":string,"tipoff_time":"${date}THH:MM:00Z"}]. If no games, return [].` }],
    });
    debug.stop_reason = r.stop_reason;
    debug.content_types = r.content.map(c => c.type);
    const textBlocks = r.content.filter(c => c.type === 'text');
    debug.text_output = textBlocks.map(c => (c as { text: string }).text).join('\n---\n');
  } catch (err) {
    debug.error = String(err);
    debug.error_detail = err instanceof Error ? err.message : 'unknown';
  }

  return NextResponse.json(debug);
}
