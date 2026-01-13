import sqlite3 from "sqlite3";
export const db = new sqlite3.Database("database.sqlite");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    discord_id TEXT UNIQUE,
    username TEXT,
    avatar TEXT,
    balance INTEGER DEFAULT 1000,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    playerA TEXT,
    playerB TEXT,
    status TEXT,
    oddsA REAL,
    oddsD REAL,
    oddsB REAL,
    result TEXT
  )`);
});
