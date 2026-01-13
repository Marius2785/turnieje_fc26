import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ===== DANE ===== */
let users = [
  { login: "admin", password: "admin123", saldo: 1000, admin: true }
];

let matches = [];
let bets = [];
let matchId = 1;

/* ===== MIDDLEWARE ===== */
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 🔴 TO BYŁ BRAK
app.use(
  session({
    secret: "fc26-secret",
    resave: false,
    saveUninitialized: false
  })
);

/* ===== STATIC ===== */
app.use(express.static(path.join(__dirname, "../public")));

/* ===== AUTH ===== */
app.post("/api/register", (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: "Brak danych" });
  }

  if (users.find(u => u.login === login)) {
    return res.status(400).json({ error: "Login zajęty" });
  }

  users.push({ login, password, saldo: 1000, admin: false });
  res.json({ ok: true });
});

app.post("/api/login", (req, res) => {
  const { login, password } = req.body;

  const user = users.find(
    u => u.login === login && u.password === password
  );

  if (!user) {
    return res.status(400).json({ error: "Złe dane logowania" });
  }

  req.session.user = user.login;
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.json({ logged: false });
  }

  const user = users.find(u => u.login === req.session.user);
  res.json({
    logged: true,
    login: user.login,
    saldo: user.saldo,
    admin: user.admin
  });
});

/* ===== MECZE ===== */
app.get("/api/matches", (req, res) => {
  res.json(matches);
});

app.post("/api/bet", (req, res) => {
  const user = users.find(u => u.login === req.session.user);
  if (!user) return res.status(401).json({ error: "Nie zalogowany" });

  const { matchId, team, amount } = req.body;
  const match = matches.find(m => m.id === Number(matchId));

  if (!match || match.status !== "open") {
    return res.status(400).json({ error: "Mecz niedostępny" });
  }

  if (user.saldo < amount) {
    return res.status(400).json({ error: "Brak środków" });
  }

  user.saldo -= Number(amount);
  bets.push({ user: user.login, matchId: match.id, team, amount: Number(amount) });
  res.json({ ok: true });
});

/* ===== ADMIN ===== */
function isAdmin(req, res, next) {
  const user = users.find(u => u.login === req.session.user);
  if (!user || !user.admin) {
    return res.status(403).json({ error: "Brak dostępu" });
  }
  next();
}

app.post("/api/admin/match", isAdmin, (req, res) => {
  const { a, b } = req.body;

  matches.push({
    id: matchId++,
    a,
    b,
    status: "open"
  });

  res.json({ ok: true });
});

app.post("/api/admin/finish", isAdmin, (req, res) => {
  const { id, result } = req.body;
  const match = matches.find(m => m.id === Number(id));

  if (!match || match.status !== "open") {
    return res.status(400).json({ error: "Błąd meczu" });
  }

  match.status = "done";
  match.result = result;

  bets
    .filter(b => b.matchId === match.id)
    .forEach(b => {
      const u = users.find(x => x.login === b.user);
      if (!u) return;
      if (result === "draw") u.saldo += b.amount;
      if (b.team === result) u.saldo += b.amount * 2;
    });

  res.json({ ok: true });
});

app.post("/api/admin/cancel", isAdmin, (req, res) => {
  const { id } = req.body;
  const match = matches.find(m => m.id === Number(id));
  if (!match) return res.status(400).json({ error: "Brak meczu" });

  match.status = "cancelled";

  bets
    .filter(b => b.matchId === match.id)
    .forEach(b => {
      const u = users.find(x => x.login === b.user);
      if (u) u.saldo += b.amount;
    });

  res.json({ ok: true });
});

/* ===== START ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("ONLINE"));
