import express from "express";
import session from "express-session";
import { pool } from "./db.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

/* ================= BASIC ================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "fc26",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "../public")));

/* ================= AUTH ================= */

app.post("/api/register", async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password)
    return res.json({ error: "Brak danych" });

  try {
    await pool.query(
      "INSERT INTO users (login,password,balance,role) VALUES ($1,$2,1000,'user')",
      [login, password]
    );
    res.json({ ok: true });
  } catch {
    res.json({ error: "Login zajęty" });
  }
});

app.post("/api/login", async (req, res) => {
  const { login, password } = req.body;

  const { rows } = await pool.query(
    "SELECT * FROM users WHERE login=$1 AND password=$2",
    [login, password]
  );

  const user = rows[0];
  if (!user) return res.json({ error: "Złe dane" });

  req.session.user = user;
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  if (!req.session.user)
    return res.json({ logged: false });

  res.json({
    logged: true,
    login: req.session.user.login,
    balance: req.session.user.balance,
    admin: req.session.user.role === "admin"
  });
});

/* ================= MATCHES ================= */

app.get("/api/matches", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM matches WHERE status='open'"
  );
  res.json(rows);
});

/* ================= ODDS ================= */

function calculateOdds(a, d, b) {
  const buffer = 0.08;
  const total = a + d + b + 1;

  const calc = x =>
    Math.max(1.2, (total / (x + 1)) * (1 - buffer));

  return {
    oddsA: Number(calc(a).toFixed(2)),
    oddsD: Number(calc(d).toFixed(2)),
    oddsB: Number(calc(b).toFixed(2))
  };
}

/* ================= BET ================= */

app.post("/api/bet", async (req, res) => {
  if (!req.session.user)
    return res.json({ error: "Brak loginu" });

  const { matchId, pick, amount } = req.body;
  const stake = Number(amount);

  if (!stake || stake <= 0)
    return res.json({ error: "Zła kwota" });

  if (req.session.user.balance < stake)
    return res.json({ error: "Brak środków" });

  const matchRes = await pool.query(
    "SELECT * FROM matches WHERE id=$1 AND status='open'",
    [matchId]
  );
  const match = matchRes.rows[0];
  if (!match) return res.json({ error: "Mecz nie istnieje" });

  await pool.query(
    "INSERT INTO bets (user_id,match_id,pick,amount) VALUES ($1,$2,$3,$4)",
    [req.session.user.id, matchId, pick, stake]
  );

  await pool.query(
    "UPDATE users SET balance=balance-$1 WHERE id=$2",
    [stake, req.session.user.id]
  );

  req.session.user.balance -= stake;

  const sums = await pool.query(
    "SELECT pick, SUM(amount)::int sum FROM bets WHERE match_id=$1 GROUP BY pick",
    [matchId]
  );

  let a = 0, d = 0, b = 0;
  sums.rows.forEach(r => {
    if (r.pick === "a") a = r.sum;
    if (r.pick === "d") d = r.sum;
    if (r.pick === "b") b = r.sum;
  });

  const o = calculateOdds(a, d, b);

  await pool.query(
    "UPDATE matches SET oddsA=$1, oddsD=$2, oddsB=$3 WHERE id=$4",
    [o.oddsA, o.oddsD, o.oddsB, matchId]
  );

  res.json({ ok: true });
});

/* ================= ADMIN ================= */

function admin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.json({ error: "Brak dostępu" });
  next();
}

app.post("/api/admin/match", admin, async (req, res) => {
  const { a, b } = req.body;

  await pool.query(
    "INSERT INTO matches (a,b,oddsA,oddsD,oddsB,status) VALUES ($1,$2,2.5,2.5,2.5,'open')",
    [a, b]
  );

  res.json({ ok: true });
});

/* ======= ZAKOŃCZENIE MECZU ======= */

app.post("/api/admin/finish", admin, async (req, res) => {
  const { id, result } = req.body;

  const matchRes = await pool.query("SELECT * FROM matches WHERE id=$1", [id]);
  const match = matchRes.rows[0];
  if (!match) return res.json({ error: "Brak meczu" });

  const odds =
    result === "a" ? match.oddsa :
    result === "d" ? match.oddsd :
    match.oddsb;

  const betsRes = await pool.query(
    "SELECT * FROM bets WHERE match_id=$1 AND pick=$2",
    [id, result]
  );

  for (const b of betsRes.rows) {
    const win = b.amount * odds;
    await pool.query(
      "UPDATE users SET balance=balance+$1 WHERE id=$2",
      [win, b.user_id]
    );
  }

  await pool.query("DELETE FROM bets WHERE match_id=$1", [id]);
  await pool.query("DELETE FROM matches WHERE id=$1", [id]);

  res.json({ ok: true });
});

/* ======= ANULOWANIE MECZU ======= */

app.post("/api/admin/cancel", admin, async (req, res) => {
  const { id } = req.body;

  const betsRes = await pool.query(
    "SELECT * FROM bets WHERE match_id=$1",
    [id]
  );

  for (const b of betsRes.rows) {
    await pool.query(
      "UPDATE users SET balance=balance+$1 WHERE id=$2",
      [b.amount, b.user_id]
    );
  }

  await pool.query("DELETE FROM bets WHERE match_id=$1", [id]);
  await pool.query("DELETE FROM matches WHERE id=$1", [id]);

  res.json({ ok: true });
});

/* ======= ADMIN — UŻYTKOWNICY ======= */

app.get("/api/admin/users", admin, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, login, balance, role FROM users ORDER BY login"
  );
  res.json(rows);
});

app.post("/api/admin/balance", admin, async (req, res) => {
  const { userId, balance } = req.body;
  const b = Number(balance);
  if (isNaN(b)) return res.json({ error: "Zła kwota" });

  await pool.query(
    "UPDATE users SET balance=$1 WHERE id=$2",
    [b, userId]
  );

  res.json({ ok: true });
});

app.post("/api/admin/deleteUser", admin, async (req, res) => {
  const { userId } = req.body;

  await pool.query("DELETE FROM bets WHERE user_id=$1", [userId]);
  await pool.query("DELETE FROM users WHERE id=$1", [userId]);

  res.json({ ok: true });
});

/* ================= START ================= */

app.listen(process.env.PORT || 3000, () =>
  console.log("ONLINE")
);
