import express from "express";
import session from "express-session";
import { db } from "./db.js";
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

app.post("/api/register", (req, res) => {
  const { login, password } = req.body;
  if (!login || !password)
    return res.json({ error: "Brak danych" });

  db.run(
    "INSERT INTO users (login,password,balance,role) VALUES (?,?,1000,'user')",
    [login, password],
    err => {
      if (err) return res.json({ error: "Login zajęty" });
      res.json({ ok: true });
    }
  );
});

app.post("/api/login", (req, res) => {
  const { login, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE login=? AND password=?",
    [login, password],
    (err, user) => {
      if (!user) return res.json({ error: "Złe dane" });
      req.session.user = user;
      res.json({ ok: true });
    }
  );
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

app.get("/api/matches", (req, res) => {
  db.all(
    "SELECT * FROM matches WHERE status='open'",
    (err, rows) => res.json(rows)
  );
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

app.post("/api/bet", (req, res) => {
  if (!req.session.user)
    return res.json({ error: "Brak loginu" });

  const { matchId, pick, amount } = req.body;
  const stake = Number(amount);

  if (!stake || stake <= 0)
    return res.json({ error: "Zła kwota" });

  if (req.session.user.balance < stake)
    return res.json({ error: "Brak środków" });

  db.get(
    "SELECT * FROM matches WHERE id=? AND status='open'",
    [matchId],
    (err, match) => {
      if (!match)
        return res.json({ error: "Mecz nie istnieje" });

      db.run(
        "INSERT INTO bets (user_id,match_id,pick,amount,odds) VALUES (?,?,?,?,?)",
        [req.session.user.id, matchId, pick, stake,
         pick === "a" ? match.oddsA :
         pick === "d" ? match.oddsD :
         match.oddsB]
      );

      db.run(
        "UPDATE users SET balance=balance-? WHERE id=?",
        [stake, req.session.user.id]
      );

      req.session.user.balance -= stake;

      db.all(
        "SELECT pick, SUM(amount) sum FROM bets WHERE match_id=? GROUP BY pick",
        [matchId],
        (e, rows) => {
          let a = 0, d = 0, b = 0;

          rows.forEach(r => {
            if (r.pick === "a") a = r.sum;
            if (r.pick === "d") d = r.sum;
            if (r.pick === "b") b = r.sum;
          });

          const o = calculateOdds(a, d, b);

          db.run(
            "UPDATE matches SET oddsA=?, oddsD=?, oddsB=? WHERE id=?",
            [o.oddsA, o.oddsD, o.oddsB, matchId]
          );

          res.json({ ok: true });
        }
      );
    }
  );
});

/* ================= ADMIN ================= */

function admin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.json({ error: "Brak dostępu" });
  next();
}

app.post("/api/admin/match", admin, (req, res) => {
  const { a, b } = req.body;

  db.run(
    "INSERT INTO matches (a,b,oddsA,oddsD,oddsB,status) VALUES (?,?,?,?,?, 'open')",
    [a, b, 2.5, 2.5, 2.5],
    () => res.json({ ok: true })
  );
});

/* ======== FINISH MATCH (1/X/2) ======== */

app.post("/api/admin/finish", admin, (req, res) => {
  const { id, result } = req.body;

  db.get("SELECT * FROM matches WHERE id=? AND status='open'", [id], (err, match) => {
    if (!match) return res.json({ error: "Mecz nie istnieje" });

    db.all(
      "SELECT * FROM bets WHERE match_id=? AND pick=?",
      [id, result],
      (e, bets) => {
        bets.forEach(b => {
          const win = b.amount * b.odds;
          db.run("UPDATE users SET balance=balance+? WHERE id=?", [win, b.user_id]);
        });

        db.run("DELETE FROM bets WHERE match_id=?", [id]);
        db.run("DELETE FROM matches WHERE id=?", [id], () => {
          res.json({ ok: true });
        });
      }
    );
  });
});

/* ======== CANCEL MATCH ======== */

app.post("/api/admin/cancel", admin, (req, res) => {
  const { id } = req.body;

  db.all("SELECT * FROM bets WHERE match_id=?", [id], (e, bets) => {
    bets.forEach(b => {
      db.run("UPDATE users SET balance=balance+? WHERE id=?", [b.amount, b.user_id]);
    });

    db.run("DELETE FROM bets WHERE match_id=?", [id]);
    db.run("DELETE FROM matches WHERE id=?", [id], () => {
      res.json({ ok: true });
    });
  });
});

/* ======== USERS ======== */

app.get("/api/admin/users", admin, (req, res) => {
  db.all("SELECT id,login,balance FROM users WHERE role!='admin'", (e, rows) =>
    res.json(rows)
  );
});

app.post("/api/admin/balance", admin, (req, res) => {
  const { id, balance } = req.body;
  db.run("UPDATE users SET balance=? WHERE id=?", [balance, id], () =>
    res.json({ ok: true })
  );
});

app.post("/api/admin/deleteUser", admin, (req, res) => {
  const { id } = req.body;
  db.run("DELETE FROM users WHERE id=?", [id], () =>
    res.json({ ok: true })
  );
});

/* ================= START ================= */

app.listen(process.env.PORT || 3000, () =>
  console.log("ONLINE")
);
