import sqlite3 from "sqlite3";

export const db = new sqlite3.Database("database.sqlite");

/* ====== USERS ====== */
export const users = {
  create(login, password) {
    return new Promise((res, rej) => {
      db.run(
        `INSERT INTO users (login, password, saldo, role)
         VALUES (?, ?, 1000, 'user')`,
        [login, password],
        err => (err ? rej(err) : res())
      );
    });
  },

  getByLogin(login) {
    return new Promise((res, rej) => {
      db.get(
        `SELECT * FROM users WHERE login = ?`,
        [login],
        (err, row) => (err ? rej(err) : res(row))
      );
    });
  },

  getAll() {
    return new Promise((res, rej) => {
      db.all(`SELECT * FROM users`, (e, r) => (e ? rej(e) : res(r)));
    });
  },

  updateSaldo(id, saldo) {
    return new Promise((res, rej) => {
      db.run(
        `UPDATE users SET saldo=? WHERE id=?`,
        [saldo, id],
        e => (e ? rej(e) : res())
      );
    });
  }
};

/* ====== MATCHES ====== */
export const matches = {
  add(a, b, oa, od, ob) {
    return new Promise((res, rej) => {
      db.run(
        `INSERT INTO matches
         (playerA, playerB, status, oddsA, oddsD, oddsB)
         VALUES (?, ?, 'open', ?, ?, ?)`,
        [a, b, oa, od, ob],
        e => (e ? rej(e) : res())
      );
    });
  },

  allOpen() {
    return new Promise((res, rej) => {
      db.all(
        `SELECT * FROM matches WHERE status='open'`,
        (e, r) => (e ? rej(e) : res(r))
      );
    });
  },

  finish(id, result) {
    return new Promise((res, rej) => {
      db.run(
        `UPDATE matches SET status='finished', result=? WHERE id=?`,
        [result, id],
        e => (e ? rej(e) : res())
      );
    });
  },

  cancel(id) {
    return new Promise((res, rej) => {
      db.run(
        `UPDATE matches SET status='cancelled' WHERE id=?`,
        [id],
        e => (e ? rej(e) : res())
      );
    });
  }
};

/* ====== INIT ====== */
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE,
      password TEXT,
      saldo INTEGER,
      role TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerA TEXT,
      playerB TEXT,
      status TEXT,
      oddsA REAL,
      oddsD REAL,
      oddsB REAL,
      result TEXT
    )
  `);
});
