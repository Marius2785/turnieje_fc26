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
    INSERT INTO users (login,password,role,balance)
    VALUES ('administrator','małpyigoryle23_','admin',999999)
    ON CONFLICT (login) DO NOTHING
  `);
}

init();
