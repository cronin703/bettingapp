export interface Game {
  id: number; date: string; home_team: string; away_team: string;
  tipoff_time: string; status: 'scheduled' | 'in_progress' | 'final'; created_at?: string;
}
export interface Pick {
  id: number; game_id: number; direction: 'over' | 'under' | 'skip';
  edge_count: number; edges_fired: string[]; line: number | null;
  model_call: string | null; sizing: number; created_at?: string; run_type: 'morning' | 'pregame';
}
export interface Result {
  id?: number; pick_id: number; final_score_home: number | null; final_score_away: number | null;
  total: number | null; result: 'win' | 'loss' | 'push' | 'no_bet' | null;
  entry_line: number | null; closing_line: number | null; clv: number | null; updated_at?: string;
}
export interface CLVLog {
  id: number; date: string; bets_placed: number; wins: number; losses: number;
  avg_clv: number | null; bankroll_pct: number | null; created_at?: string;
}
export interface InjuryReport {
  team: string; player: string; status: 'out' | 'questionable' | 'probable';
  position: string; impact_level: 'high' | 'medium' | 'low';
}
export interface ModelOutput {
  edge_count: number; edges_fired: string[]; direction: 'over' | 'under' | 'skip';
  sizing: number; reasoning: string;
}
