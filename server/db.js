import sqlite3 from "sqlite3";
export const db = new sqlite3.Database("database.sqlite");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE,
    password TEXT,
    balance INTEGER DEFAULT 1000,
    role TEXT DEFAULT 'user'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playerA TEXT,
    playerB TEXT,
    status TEXT,
    oddsA REAL,
    oddsD REAL,
    oddsB REAL,
    result TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    match_id INTEGER,
    choice TEXT,
    amount INTEGER
  )`);
});
