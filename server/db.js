import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      login TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      balance INTEGER DEFAULT 1000,
      role TEXT DEFAULT 'user'
    )
  `);

  // 🆕 dodaj kolumnę approved jeśli nie istnieje
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id SERIAL PRIMARY KEY,
      a TEXT,
      b TEXT,
      oddsA REAL,
      oddsD REAL,
      oddsB REAL,
      status TEXT DEFAULT 'open'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      match_id INTEGER REFERENCES matches(id),
      pick TEXT,
      amount INTEGER
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  await pool.query(`
    INSERT INTO settings (key,value)
    VALUES ('betting_open','true')
    ON CONFLICT (key) DO NOTHING
  `);

  await pool.query(`
    INSERT INTO users (login,password,role,balance,approved)
    VALUES ('administrator','małpyigoryle233_','admin',999999,true)
    ON CONFLICT (login) DO NOTHING
  `);
}

init();
