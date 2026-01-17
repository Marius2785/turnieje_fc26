import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

const DB_DIR = "/var/data";
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

export const db = new sqlite3.Database(path.join(DB_DIR, "db.sqlite"));

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
    a TEXT,
    b TEXT,
    oddsA REAL,
    oddsD REAL,
    oddsB REAL,
    status TEXT DEFAULT 'open'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    match_id INTEGER,
    pick TEXT,
    amount INTEGER
  )`);

  db.run(
    `INSERT OR IGNORE INTO users (login,password,role,balance)
     VALUES ('administrator','małpyigoryle23_','admin',999999)`
  );
});
