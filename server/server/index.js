import express from "express";
import session from "express-session";
import passport from "passport";
import "./auth.js";
import "./db.js";

const app = express();

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
