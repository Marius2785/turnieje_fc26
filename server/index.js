import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";
import { users, matches } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(session({
  secret:"fc26",
  resave:false,
  saveUninitialized:false
}));

app.use(express.static(path.join(__dirname,"../public")));

const ADMIN_LOGINS = ["admin"];

const statusPL = s => ({
  open:"OTWARTY",
  finished:"ZAKOŃCZONY",
  cancelled:"ANULOWANY"
}[s] || s);

/* AUTH */
app.post("/api/register", async (req,res)=>{
  const {login,password} = req.body;
  if(users.find(u=>u.login===login))
    return res.status(400).json({error:"Login zajęty"});
  users.push({
    login,
    password: await bcrypt.hash(password,10),
    raw: password,
    saldo:1000
  });
  res.json({ok:true});
});

app.post("/api/login", async (req,res)=>{
  const {login,password} = req.body;
  const u = users.find(u=>u.login===login);
  if(!u || !(await bcrypt.compare(password,u.password)))
    return res.status(400).json({error:"Złe dane logowania"});
  req.session.user = login;
  res.json({ok:true});
});

app.post("/api/logout",(req,res)=>{
  req.session.destroy(()=>res.json({ok:true}));
});

app.get("/api/me",(req,res)=>{
  const u = users.find(x=>x.login===req.session.user);
  if(!u) return res.json({logged:false});
  res.json({
    logged:true,
    login:u.login,
    saldo:u.saldo,
    admin: ADMIN_LOGINS.includes(u.login)
  });
});

/* MATCHES */
app.get("/api/matches",(req,res)=>{
  res.json(
    matches
      .filter(m=>m.status==="open")
      .map(m=>({
        ...m,
        statusPL: statusPL(m.status)
      }))
  );
});

app.post("/api/bet",(req,res)=>{
  const u = users.find(x=>x.login===req.session.user);
  if(!u) return res.sendStatus(401);
  const m = matches.find(x=>x.id===req.body.matchId);
  if(!m || m.status!=="open") return res.sendStatus(400);
  if(u.saldo < req.body.amount) return res.status(400).json({error:"Brak środków"});
  u.saldo -= req.body.amount;
  m.bets.push({...req.body,user:u.login});
  res.json({ok:true});
});

/* ADMIN */
app.post("/api/admin/match",(req,res)=>{
  if(!ADMIN_LOGINS.includes(req.session.user)) return res.sendStatus(403);
  matches.push({
    id:Date.now(),
    a:req.body.a,
    b:req.body.b,
    odds:{a:2.1,draw:3.0,b:2.4},
    bets:[],
    status:"open"
  });
  res.json({ok:true});
});

app.post("/api/admin/finish",(req,res)=>{
  if(!ADMIN_LOGINS.includes(req.session.user)) return res.sendStatus(403);
  const m = matches.find(x=>x.id===req.body.id);
  if(!m) return res.sendStatus(400);
  m.status="finished";
  m.bets.forEach(b=>{
    if(b.team===req.body.result){
      const u = users.find(x=>x.login===b.user);
      u.saldo += b.amount * m.odds[b.team];
    }
  });
  matches.splice(matches.indexOf(m),1);
  res.json({ok:true});
});

app.post("/api/admin/cancel",(req,res)=>{
  if(!ADMIN_LOGINS.includes(req.session.user)) return res.sendStatus(403);
  const m = matches.find(x=>x.id===req.body.id);
  if(!m) return res.sendStatus(400);
  m.bets.forEach(b=>{
    const u = users.find(x=>x.login===b.user);
    u.saldo += b.amount;
  });
  matches.splice(matches.indexOf(m),1);
  res.json({ok:true});
});

app.get("/api/admin/users",(req,res)=>{
  if(!ADMIN_LOGINS.includes(req.session.user)) return res.sendStatus(403);
  res.json(users);
});

app.post("/api/admin/saldo",(req,res)=>{
  if(!ADMIN_LOGINS.includes(req.session.user)) return res.sendStatus(403);
  const u = users.find(x=>x.login===req.body.login);
  u.saldo = req.body.saldo;
  res.json({ok:true});
});

app.get("/api/top",(req,res)=>{
  res.json([...users]
    .sort((a,b)=>b.saldo-a.saldo)
    .slice(0,10));
});

app.listen(3000,()=>console.log("ONLINE"));
