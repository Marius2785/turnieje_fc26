import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ===== KONFIG ===== */
const ADMINS = ["admin", "mariusz"]; // ← TU DODAJESZ ADMINÓW (LOGINY)

/* ===== FAKE BAZA UŻYTKOWNIKÓW ===== */
const USERS = [
  { login: "admin", password: "admin123" },
  { login: "user", password: "user123" }
];

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

app.use(express.static(path.join(__dirname, "../public")));

/* ===== API ===== */

// sprawdzanie sesji
app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.json({ logged: false });

  res.json({
    logged: true,
    login: req.session.user.login,
    admin: ADMINS.includes(req.session.user.login)
  });
});

// logowanie
app.post("/api/login", (req, res) => {
  const { login, password } = req.body;

  const user = USERS.find(
    u => u.login === login && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Zły login lub hasło" });
  }

  req.session.user = { login: user.login };
  res.json({ success: true });
});

// wylogowanie
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

/* ===== FRONT ===== */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

/* ===== START ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("ONLINE"));
