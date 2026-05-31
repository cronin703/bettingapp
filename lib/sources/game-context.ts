import Anthropic from '@anthropic-ai/sdk';

export interface GameContext {
  // E1 — schedule
  home_back_to_back: boolean;
  away_back_to_back: boolean;
  home_3_in_4: boolean;
  away_3_in_4: boolean;
  away_cross_country_travel: boolean;
  tipoff_hour_et: number | null; // for early tipoff flag

  // E2 — pace (possessions per 40 min, rank 1=fastest … 12=slowest)
  home_pace_per40: number | null;
  away_pace_per40: number | null;
  home_pace_rank: number | null;
  away_pace_rank: number | null;

  // E3 — team defensive rating (per 100 possessions, rank 1=best … 12=worst)
  home_def_rtg: number | null;
  home_def_rtg_rank: number | null;
  away_def_rtg: number | null;
  away_def_rtg_rank: number | null;

  // E4 — referee crew
  referee_crew: string | null;
  referee_tendency: 'foul-light' | 'foul-heavy' | 'neutral' | null;

  // E5 — season week
  season_week: number | null;

  // E6 — injuries (from existing fetchInjuries — passed in separately)

  // E7 — line movement + public betting
  opening_total: number | null;
  current_total: number | null;
  public_pct_over: number | null; // e.g. 65 for 65%

  // E9 — scoring trends (last 10 game totals per team, and season avg)
  home_last10_totals: number[];
  away_last10_totals: number[];
  home_season_avg_total: number | null;
  away_season_avg_total: number | null;

  // E8 — shooting regression signal
  home_fg_pct_last5: number | null;
  away_fg_pct_last5: number | null;
  home_true_fg_pct: number | null; // season eFG%
  away_true_fg_pct: number | null;
}

const client = new Anthropic();

function extractJson<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  const raw = fenced ? fenced[1] : (text.match(/\{[\s\S]*\}/) ?? [])[0];
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function fetchGameContext(home: string, away: string, date: string): Promise<GameContext> {
  const defaults: GameContext = {
    home_back_to_back: false, away_back_to_back: false,
    home_3_in_4: false, away_3_in_4: false,
    away_cross_country_travel: false, tipoff_hour_et: null,
    home_pace_per40: null, away_pace_per40: null,
    home_pace_rank: null, away_pace_rank: null,
    home_def_rtg: null, home_def_rtg_rank: null,
    away_def_rtg: null, away_def_rtg_rank: null,
    referee_crew: null, referee_tendency: null,
    season_week: null,
    opening_total: null, current_total: null, public_pct_over: null,
    home_last10_totals: [], away_last10_totals: [],
    home_season_avg_total: null, away_season_avg_total: null,
    home_fg_pct_last5: null, away_fg_pct_last5: null,
    home_true_fg_pct: null, away_true_fg_pct: null,
  };

  try {
    const r = await client.messages.create({
      model: 'claude-opus-4-8', max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 } as never],
      messages: [{ role: 'user', content:
        `Research the following for the WNBA game: ${away} at ${home} on ${date}.\n` +
        `Search Her Hoop Stats, Action Network, RotoWire, ESPN, and the WNBA schedule.\n` +
        `Return ONLY this JSON inside a \`\`\`json block:\n` +
        `{\n` +
        `  "home_back_to_back": bool,\n` +
        `  "away_back_to_back": bool,\n` +
        `  "home_3_in_4": bool,\n` +
        `  "away_3_in_4": bool,\n` +
        `  "away_cross_country_travel": bool,\n` +
        `  "tipoff_hour_et": number_or_null,\n` +
        `  "home_pace_per40": number_or_null,\n` +
        `  "away_pace_per40": number_or_null,\n` +
        `  "home_pace_rank": number_or_null,\n` +
        `  "away_pace_rank": number_or_null,\n` +
        `  "home_def_rtg": number_or_null,\n` +
        `  "home_def_rtg_rank": number_or_null,\n` +
        `  "away_def_rtg": number_or_null,\n` +
        `  "away_def_rtg_rank": number_or_null,\n` +
        `  "referee_crew": string_or_null,\n` +
        `  "referee_tendency": "foul-light"|"foul-heavy"|"neutral"|null,\n` +
        `  "season_week": number_or_null,\n` +
        `  "opening_total": number_or_null,\n` +
        `  "current_total": number_or_null,\n` +
        `  "public_pct_over": number_or_null,\n` +
        `  "home_last10_totals": [array of last 10 game combined scores],\n` +
        `  "away_last10_totals": [array of last 10 game combined scores],\n` +
        `  "home_season_avg_total": number_or_null,\n` +
        `  "away_season_avg_total": number_or_null,\n` +
        `  "home_fg_pct_last5": number_or_null,\n` +
        `  "away_fg_pct_last5": number_or_null,\n` +
        `  "home_true_fg_pct": number_or_null,\n` +
        `  "away_true_fg_pct": number_or_null\n` +
        `}`
      }],
    });

    const text = r.content.filter(c => c.type === 'text').map(c => (c as { text: string }).text).join('\n');
    const parsed = extractJson<Partial<GameContext>>(text);
    if (parsed) return { ...defaults, ...parsed };
  } catch (e) { console.error('fetchGameContext error:', e); }

  return defaults;
}
