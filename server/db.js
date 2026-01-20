import { createClient } from "@libsql/client";

export const db = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_TOKEN
});

async function init() {
  await db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE,
    password TEXT,
    balance INTEGER DEFAULT 1000,
    role TEXT DEFAULT 'user'
  )`);

  await db.execute(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    a TEXT,
    b TEXT,
    oddsA REAL,
    oddsD REAL,
    oddsB REAL,
    status TEXT DEFAULT 'open'
  )`);

  await db.execute(`
  CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    match_id INTEGER,
    pick TEXT,
    amount INTEGER
  )`);

  // ADMIN – tworzy się tylko raz
  await db.execute(`
  INSERT OR IGNORE INTO users (login,password,role,balance)
  VALUES ('administrator','małpyigoryle23_','admin',999999)
  `);
}

init();
