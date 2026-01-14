import express from "express";
import session from "express-session";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

/* ===== DB ===== */

const db = new sqlite3.Database("database.sqlite");

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
    status TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    match_id INTEGER,
    pick TEXT,
    amount INTEGER
  )`);
});

/* ===== APP ===== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "fc26",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "../public")));

/* ===== AUTH ===== */

app.post("/api/register", (req, res) => {
  const login = req.body.login;
  const password = req.body.password;

  if (!login || !password) {
    return res.json({ error: "Brak danych" });
  }

  db.run(
    "INSERT INTO users (login, password) VALUES (?, ?)",
    [login, password],
    err => {
      if (err) return res.json({ error: "Login zajęty" });
      res.json({ ok: true });
    }
  );
});

app.post("/api/login", (req, res) => {
  const login = req.body.login;
  const password = req.body.password;

  if (!login || !password) {
    return res.json({ error: "Brak danych" });
  }

  db.get(
    "SELECT * FROM users WHERE login = ?",
    [login],
    (err, user) => {
      if (!user) return res.json({ error: "Złe dane" });
      if (user.password !== password)
        return res.json({ error: "Złe dane" });

      req.session.user = {
        id: user.id,
        login: user.login,
        balance: user.balance,
        role: user.role
      };

      res.json({ ok: true });
    }
  );
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.json({ logged: false });

  res.json({
    logged: true,
    login: req.session.user.login,
    balance: req.session.user.balance,
    admin: req.session.user.role === "admin"
  });
});

/* ===== MATCHES ===== */

app.get("/api/matches", (req, res) => {
  db.all("SELECT * FROM matches WHERE status='open'", (e, rows) => {
    res.json(rows);
  });
});

app.post("/api/bet", (req, res) => {
  if (!req.session.user)
    return res.json({ error: "Brak loginu" });

  const { matchId, pick, amount } = req.body;

  if (!matchId || !pick || !amount)
    return res.json({ error: "Brak danych" });

  if (req.session.user.balance < amount)
    return res.json({ error: "Brak środków" });

  db.run(
    "INSERT INTO bets (user_id, match_id, pick, amount) VALUES (?, ?, ?, ?)",
    [req.session.user.id, matchId, pick, amount]
  );

  db.run(
    "UPDATE users SET balance = balance - ? WHERE id = ?",
    [amount, req.session.user.id]
  );

  req.session.user.balance -= amount;
  res.json({ ok: true });
});

/* ===== ADMIN ===== */

function admin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.json({ error: "Brak dostępu" });
  next();
}

app.post("/api/admin/match", admin, (req, res) => {
  const { a, b, oddsA, oddsD, oddsB } = req.body;

  db.run(
    "INSERT INTO matches (a,b,oddsA,oddsD,oddsB,status) VALUES (?,?,?,?,?,'open')",
    [a, b, oddsA, oddsD, oddsB],
    () => res.json({ ok: true })
  );
});

app.post("/api/admin/finish", admin, (req, res) => {
  const { id, result } = req.body;

  db.all("SELECT * FROM bets WHERE match_id=?", [id], (e, bets) => {
    db.get("SELECT * FROM matches WHERE id=?", [id], (e, m) => {

      bets.forEach(b => {
        if (b.pick === result) {
          const odd =
            result === "a" ? m.oddsA :
            result === "b" ? m.oddsB :
            m.oddsD;

          const payout = Math.floor(b.amount * odd);
          db.run(
            "UPDATE users SET balance = balance + ? WHERE id=?",
            [payout, b.user_id]
          );
        }
      });

      db.run("DELETE FROM bets WHERE match_id=?", [id]);
      db.run("DELETE FROM matches WHERE id=?", [id]);
      res.json({ ok: true });
    });
  });
});

app.post("/api/admin/balance", admin, (req, res) => {
  const { login, amount } = req.body;
  db.run(
    "UPDATE users SET balance=? WHERE login=?",
    [amount, login],
    () => res.json({ ok: true })
  );
});

/* ===== START ===== */

app.listen(process.env.PORT || 3000, () => {
  console.log("SERVER ONLINE");
});
