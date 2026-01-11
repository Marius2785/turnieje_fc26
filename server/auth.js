import passport from "passport";
import { Strategy } from "passport-discord";
import { db } from "./db.js";

const ADMINS = [
  "878644549579341834",
  "1110642941875191880"
];

passport.use(new Strategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL,
  scope: ["identify"]
}, (a, r, profile, done) => {
  db.get("SELECT * FROM users WHERE discord_id=?", [profile.id], (e, user) => {
    if (user) return done(null, user);

    const role = ADMINS.includes(profile.id) ? "admin" : "user";
    db.run(
      "INSERT INTO users (discord_id, username, avatar, role) VALUES (?,?,?,?)",
      [profile.id, profile.username, profile.avatar, role],
      () => db.get("SELECT * FROM users WHERE discord_id=?", [profile.id], (e,u)=>done(null,u))
    );
  });
}));

passport.serializeUser((u, d) => d(null, u.discord_id));
passport.deserializeUser((id, d) => {
  db.get("SELECT * FROM users WHERE discord_id=?", [id], (e,u)=>d(null,u));
});
