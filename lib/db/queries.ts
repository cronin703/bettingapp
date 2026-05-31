import { sql } from '@vercel/postgres';
import type { Game, Pick, Result, CLVLog } from '@/lib/types';

export async function getTodaysPicks() {
  const { rows } = await sql`
    SELECT p.*, g.home_team, g.away_team, g.tipoff_time, g.date
    FROM picks p JOIN games g ON p.game_id = g.id
    WHERE g.date = CURRENT_DATE ORDER BY g.tipoff_time ASC`;
  return rows;
}
export async function getAllResults() {
  const { rows } = await sql`
    SELECT r.*, p.direction, p.line, p.edge_count, p.edges_fired, p.sizing, g.home_team, g.away_team, g.date
    FROM results r JOIN picks p ON r.pick_id = p.id JOIN games g ON p.game_id = g.id ORDER BY g.date DESC`;
  return rows;
}
export async function getCLVLog(): Promise<CLVLog[]> {
  const { rows } = await sql<CLVLog>`SELECT * FROM clv_log ORDER BY date DESC LIMIT 90`;
  return rows;
}
export async function upsertGame(game: Omit<Game, 'id' | 'created_at'>): Promise<number> {
  const { rows } = await sql`
    INSERT INTO games (date, home_team, away_team, tipoff_time, status)
    VALUES (${game.date}, ${game.home_team}, ${game.away_team}, ${game.tipoff_time}, ${game.status})
    ON CONFLICT (date, home_team, away_team) DO UPDATE SET tipoff_time=EXCLUDED.tipoff_time, status=EXCLUDED.status RETURNING id`;
  if (rows.length > 0) return rows[0].id;
  const { rows: ex } = await sql`SELECT id FROM games WHERE date=${game.date} AND home_team=${game.home_team} AND away_team=${game.away_team}`;
  return ex[0].id;
}
export async function upsertPick(pick: Omit<Pick, 'id' | 'created_at'>): Promise<number> {
  const { rows } = await sql`
    INSERT INTO picks (game_id, direction, edge_count, edges_fired, line, model_call, sizing, run_type)
    VALUES (${pick.game_id}, ${pick.direction}, ${pick.edge_count}, ${JSON.stringify(pick.edges_fired)},
            ${pick.line}, ${pick.model_call}, ${pick.sizing}, ${pick.run_type})
    ON CONFLICT (game_id, run_type) DO UPDATE SET direction=EXCLUDED.direction, edge_count=EXCLUDED.edge_count,
      edges_fired=EXCLUDED.edges_fired, line=EXCLUDED.line, model_call=EXCLUDED.model_call, sizing=EXCLUDED.sizing
    RETURNING id`;
  if (rows.length > 0) return rows[0].id;
  const { rows: ex } = await sql`SELECT id FROM picks WHERE game_id=${pick.game_id} AND run_type=${pick.run_type}`;
  if (ex.length > 0) {
    await sql`UPDATE picks SET direction=${pick.direction}, edge_count=${pick.edge_count},
      edges_fired=${JSON.stringify(pick.edges_fired)}, line=${pick.line}, model_call=${pick.model_call}, sizing=${pick.sizing}
      WHERE id=${ex[0].id}`;
    return ex[0].id;
  }
  throw new Error('upsertPick failed');
}
export async function updateResult(result: Omit<Result, 'id'>): Promise<void> {
  await sql`
    INSERT INTO results (pick_id, final_score_home, final_score_away, total, result, entry_line, closing_line, clv)
    VALUES (${result.pick_id}, ${result.final_score_home}, ${result.final_score_away}, ${result.total},
            ${result.result}, ${result.entry_line}, ${result.closing_line}, ${result.clv})
    ON CONFLICT (pick_id) DO UPDATE SET
      final_score_home=EXCLUDED.final_score_home, final_score_away=EXCLUDED.final_score_away,
      total=EXCLUDED.total, result=EXCLUDED.result, closing_line=EXCLUDED.closing_line,
      clv=EXCLUDED.clv, updated_at=NOW()`;
}
