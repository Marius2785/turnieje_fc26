import express from "express";
import session from "express-session";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

/* ====== PATH ====== */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ====== RENDER / HTTPS FIX (BARDZO WAŻNE) ====== */
app.set("trust proxy", 1);

/* ====== STATIC FILES ====== */
app.use(express.static(path.join(__dirname, "public")));

/* ====== KONFIG ====== */
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const CALLBACK_URL =
  "https://turnieje-fc26.onrender.com/auth/discord/callback";

const ADMINS = [
  "878644549579341834",
  "1110642941875191880"
];

/* ====== SESJA (POPRAWIONA POD RENDER) ====== */
app.use(
  session({
    name: "fc26.sid",
    secret: "fc26-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      sameSite: "none"
    }
  })
);

/* ====== STRONA GŁÓWNA ====== */
app.get("/", (req, res) => {
  if (!req.session.user) {
    return res.sendFile(path.join(__dirname, "public", "index.html"));
  }

  const user = req.session.user;
  const isAdmin = ADMINS.includes(user.id);

  res.send(`
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8" />
      <title>Turnieje FC 26</title>
      <link rel="stylesheet" href="/style.css" />
    </head>
    <body>
      <div class="card">
        <h1>Witaj ${user.username}</h1>
        <p>Saldo: 1000 💰</p>
        ${isAdmin ? "<p><b>Panel admina AKTYWNY</b></p>" : ""}
        <a class="btn" href="/logout">Wyloguj</a>
      </div>
    </body>
    </html>
  `);
});

/* ====== START LOGOWANIA ====== */
app.get("/auth/discord", (req, res) => {
  const url =
    `https://discord.com/api/oauth2/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
    `&response_type=code&scope=identify`;

  res.redirect(url);
});

/* ====== CALLBACK ====== */
app.get("/auth/discord/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("Brak kodu Discord");

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: CALLBACK_URL
    })
  });

  const tokenData = await tokenRes.json();

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });

  const user = await userRes.json();

  req.session.user = {
    id: user.id,
    username: user.username
  };

  res.redirect("/");
});

/* ====== WYLOGUJ ====== */
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

/* ====== START ====== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("ONLINE"));
