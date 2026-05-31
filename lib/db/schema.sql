CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY, date DATE NOT NULL, home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL, tipoff_time TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'scheduled', created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, home_team, away_team)
);
CREATE TABLE IF NOT EXISTS picks (
  id SERIAL PRIMARY KEY, game_id INTEGER REFERENCES games(id),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('over','under','skip')),
  edge_count INTEGER NOT NULL DEFAULT 0, edges_fired JSONB NOT NULL DEFAULT '[]',
  line NUMERIC(5,1), model_call TEXT, sizing NUMERIC(4,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  run_type VARCHAR(10) NOT NULL CHECK (run_type IN ('morning','pregame')),
  UNIQUE (game_id, run_type)
);
CREATE TABLE IF NOT EXISTS results (
  id SERIAL PRIMARY KEY, pick_id INTEGER REFERENCES picks(id) UNIQUE,
  final_score_home INTEGER, final_score_away INTEGER, total INTEGER,
  result VARCHAR(10) CHECK (result IN ('win','loss','push','no_bet')),
  entry_line NUMERIC(5,1), closing_line NUMERIC(5,1), clv NUMERIC(5,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS clv_log (
  id SERIAL PRIMARY KEY, date DATE NOT NULL UNIQUE,
  bets_placed INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0,
  avg_clv NUMERIC(5,2), bankroll_pct NUMERIC(5,2), created_at TIMESTAMPTZ DEFAULT NOW()
);
