import express from "express";
import session from "express-session";
import passport from "passport";
import "./auth.js";
import "./db.js";

const app = express();

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Turnieje FC 26</title>
        <style>
          body {
            background: #0f172a;
            color: white;
            font-family: Arial;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .box {
            text-align: center;
          }
          a {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-size: 18px;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>Turnieje FC 26</h1>
          <p>Wirtualne obstawianie meczów</p>
          <a href="/auth/discord">Zaloguj przez Discord</a>
        </div>
      </body>
    </html>
  `);
});

app.use(express.static("public"));
app.use(express.json());
app.use(session({ secret: "fc26", resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.get("/auth/discord", passport.authenticate("discord"));
app.get("/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => res.redirect("/")
);

app.get("/api/me", (req,res)=>res.json(req.user||null));

app.listen(3000, () => console.log("ONLINE"));
