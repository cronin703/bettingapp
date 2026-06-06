import Anthropic from '@anthropic-ai/sdk';

export interface GameContext {
  // E1 — schedule fatigue
  home_back_to_back: boolean;
  away_back_to_back: boolean;
  home_3_in_4: boolean;
  away_3_in_4: boolean;

  // E2 — pace (possessions per 40, rank 1=fastest … 15=slowest in 15-team league)
  home_pace_per40: number | null;
  away_pace_per40: number | null;
  home_pace_rank: number | null;
  away_pace_rank: number | null;

  // E3 — defensive rating (per 100 possessions, rank 1=best defense)
  home_def_rtg: number | null;
  home_def_rtg_rank: number | null;
  away_def_rtg: number | null;
  away_def_rtg_rank: number | null;
  home_high_crowd_venue: boolean; // Chase Center, Michelob Ultra, Mohegan Sun, etc.

  // E4 — referee crew
  referee_crew: string | null;
  referee_tendency: 'foul-light' | 'foul-heavy' | 'neutral' | null;

  // E5 — season week (expires after Week 6)
  season_week: number | null;

  // E7 — line movement + public betting
  opening_total: number | null;
  current_total: number | null;
  public_pct_over: number | null; // e.g. 65 for 65%
  steam_move_under: boolean;

  // E8 — shooting regression (Haslametrics ABS / FG Performance)
  home_fg_pct_last5: number | null;
  away_fg_pct_last5: number | null;
  home_true_fg_pct: number | null;
  away_true_fg_pct: number | null;

  // E9 — scoring trends
  home_last10_totals: number[];
  away_last10_totals: number[];
  home_season_avg_total: number | null;
  away_season_avg_total: number | null;

  // E10 — travel
  away_cross_country_travel: boolean;
  tipoff_hour_et: number | null;

  // E11 — look-ahead
  home_marquee_game_within_48h: boolean;
  away_marquee_game_within_48h: boolean;

  // E12 — Commissioner's Cup (Jun 1–17)
  is_commissioners_cup_window: boolean;
  home_cup_alive: boolean | null;   // null = unknown
  away_cup_alive: boolean | null;
  cup_differential_in_play: boolean; // point diff is live tiebreaker

  // E13 — expansion team discount
  home_is_expansion: boolean;
  away_is_expansion: boolean;
}

const EXPANSION_TEAMS = ['Portland Fire', 'Toronto Tempo'];

// High-crowd venues with documented home-court scoring suppression
const HIGH_CROWD_VENUES: Record<string, boolean> = {
  'Connecticut Sun': true,
  'Las Vegas Aces': true,
  'Seattle Storm': true,
  'New York Liberty': true,
};

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
    home_pace_per40: null, away_pace_per40: null,
    home_pace_rank: null, away_pace_rank: null,
    home_def_rtg: null, home_def_rtg_rank: null,
    away_def_rtg: null, away_def_rtg_rank: null,
    home_high_crowd_venue: HIGH_CROWD_VENUES[home] ?? false,
    referee_crew: null, referee_tendency: null,
    season_week: null,
    opening_total: null, current_total: null, public_pct_over: null, steam_move_under: false,
    home_fg_pct_last5: null, away_fg_pct_last5: null,
    home_true_fg_pct: null, away_true_fg_pct: null,
    home_last10_totals: [], away_last10_totals: [],
    home_season_avg_total: null, away_season_avg_total: null,
    away_cross_country_travel: false, tipoff_hour_et: null,
    home_marquee_game_within_48h: false, away_marquee_game_within_48h: false,
    is_commissioners_cup_window: false, home_cup_alive: null, away_cup_alive: null, cup_differential_in_play: false,
    home_is_expansion: EXPANSION_TEAMS.includes(home),
    away_is_expansion: EXPANSION_TEAMS.includes(away),
  };

  try {
    const r = await client.messages.create({
      model: 'claude-opus-4-8', max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 } as never],
      messages: [{ role: 'user', content:
        `Research the following for the WNBA game: ${away} at ${home} on ${date}.\n` +
        `Search Her Hoop Stats, Action Network, RotoWire, ESPN, WNBA.com, and the WNBA schedule.\n` +
        `Also check Commissioner's Cup standings if date is June 1–17 2026.\n` +
        `Return ONLY this JSON inside a \`\`\`json block — use null for unknown values:\n` +
        `{\n` +
        `  "home_back_to_back": bool,\n` +
        `  "away_back_to_back": bool,\n` +
        `  "home_3_in_4": bool,\n` +
        `  "away_3_in_4": bool,\n` +
        `  "home_pace_per40": number|null,\n` +
        `  "away_pace_per40": number|null,\n` +
        `  "home_pace_rank": number|null,\n` +
        `  "away_pace_rank": number|null,\n` +
        `  "home_def_rtg": number|null,\n` +
        `  "home_def_rtg_rank": number|null,\n` +
        `  "away_def_rtg": number|null,\n` +
        `  "away_def_rtg_rank": number|null,\n` +
        `  "referee_crew": string|null,\n` +
        `  "referee_tendency": "foul-light"|"foul-heavy"|"neutral"|null,\n` +
        `  "season_week": number|null,\n` +
        `  "opening_total": number|null,\n` +
        `  "current_total": number|null,\n` +
        `  "public_pct_over": number|null,\n` +
        `  "steam_move_under": bool,\n` +
        `  "home_fg_pct_last5": number|null,\n` +
        `  "away_fg_pct_last5": number|null,\n` +
        `  "home_true_fg_pct": number|null,\n` +
        `  "away_true_fg_pct": number|null,\n` +
        `  "home_last10_totals": number[],\n` +
        `  "away_last10_totals": number[],\n` +
        `  "home_season_avg_total": number|null,\n` +
        `  "away_season_avg_total": number|null,\n` +
        `  "away_cross_country_travel": bool,\n` +
        `  "tipoff_hour_et": number|null,\n` +
        `  "home_marquee_game_within_48h": bool,\n` +
        `  "away_marquee_game_within_48h": bool,\n` +
        `  "is_commissioners_cup_window": bool,\n` +
        `  "home_cup_alive": bool|null,\n` +
        `  "away_cup_alive": bool|null,\n` +
        `  "cup_differential_in_play": bool\n` +
        `}`
      }],
    });

    const text = r.content.filter(c => c.type === 'text').map(c => (c as { text: string }).text).join('\n');
    const parsed = extractJson<Partial<GameContext>>(text);
    if (parsed) return { ...defaults, ...parsed };
  } catch (e) { console.error('fetchGameContext error:', e); }

  return defaults;
}
