import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ===== KONFIG ===== */
const ADMINS = ["admin"];

/* ===== DANE (PAMIĘĆ) ===== */
let users = [
  { login: "admin", password: "admin123", saldo: 1000 }
];

let matches = []; 
let bets = [];

/* ===== MIDDLEWARE ===== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "fc26-secret",
    resave: false,
    saveUninitialized: false
  })
);

app.use(express.static(path.join(__dirname, "..", "public")));

/* ===== API AUTH ===== */
app.post("/api/register", (req, res) => {
  const { login, password } = req.body;

  if (!login || !password)
    return res.status(400).json({ error: "Brak danych" });

  if (users.find(u => u.login === login))
    return res.status(400).json({ error: "Login zajęty" });

  users.push({ login, password, saldo: 1000 });
  res.json({ success: true });
});

app.post("/api/login", (req, res) => {
  const { login, password } = req.body;
  const user = users.find(
    u => u.login === login && u.password === password
  );

  if (!user)
    return res.status(401).json({ error: "Złe dane" });

  req.session.user = { login };
  res.json({ success: true });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get("/api/me", (req, res) => {
  if (!req.session.user)
    return res.json({ logged: false });

  const user = users.find(u => u.login === req.session.user.login);

  res.json({
    logged: true,
    login: user.login,
    saldo: user.saldo,
    admin: ADMINS.includes(user.login)
  });
});

/* ===== MECZE ===== */
app.post("/api/admin/match", (req, res) => {
  if (!req.session.user || !ADMINS.includes(req.session.user.login))
    return res.sendStatus(403);

  const { a, b } = req.body;

  matches.push({
    id: Date.now(),
    a,
    b,
    open: true,
    winner: null
  });

  res.json({ success: true });
});

app.post("/api/admin/close", (req, res) => {
  const { id, winner } = req.body;

  const match = matches.find(m => m.id == id);
  if (!match) return res.sendStatus(404);

  match.open = false;
  match.winner = winner;

  bets
    .filter(b => b.matchId == id && b.team === winner)
    .forEach(b => {
      const user = users.find(u => u.login === b.login);
      user.saldo += b.amount * 2;
    });

  res.json({ success: true });
});

app.get("/api/matches", (req, res) => {
  res.json(matches);
});

/* ===== OBSTAWIANIE ===== */
app.post("/api/bet", (req, res) => {
  const { matchId, team, amount } = req.body;
  const user = users.find(u => u.login === req.session.user.login);

  if (user.saldo < amount)
    return res.status(400).json({ error: "Brak środków" });

  user.saldo -= amount;

  bets.push({
    login: user.login,
    matchId,
    team,
    amount
  });

  res.json({ success: true });
});

/* ===== SPA ===== */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("ONLINE"));
