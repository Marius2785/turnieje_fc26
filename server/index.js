const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
app.use(express.json());

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: false
}));

/* ===== DANE ===== */

let users = [
  { login: "admin", password: "admin123", admin: true, saldo: 1000 }
];

let matches = [];
let bets = [];
let matchId = 1;

/* ===== MIDDLEWARE ===== */

function isAdmin(req,res,next){
  const u = users.find(x=>x.login===req.session.user);
  if(!u || !u.admin) return res.status(403).json({error:"Brak dostępu"});
  next();
}

/* ===== AUTH ===== */

app.post("/api/register",(req,res)=>{
  const {login,password} = req.body;
  if(!login || !password)
    return res.status(400).json({error:"Brak danych"});
  if(users.find(u=>u.login===login))
    return res.status(400).json({error:"Login zajęty"});

  users.push({ login, password, admin:false, saldo:1000 });
  res.json({ok:true});
});

app.post("/api/login",(req,res)=>{
  const {login,password} = req.body;
  const u = users.find(x=>x.login===login && x.password===password);
  if(!u) return res.status(400).json({error:"Złe dane logowania"});
  req.session.user = u.login;
  res.json({ok:true});
});

app.post("/api/logout",(req,res)=>{
  req.session.destroy(()=>res.json({ok:true}));
});

app.get("/api/me",(req,res)=>{
  const u = users.find(x=>x.login===req.session.user);
  if(!u) return res.json({logged:false});
  res.json({ logged:true, login:u.login, saldo:u.saldo, admin:u.admin });
});

/* ===== MECZE ===== */

app.get("/api/matches",(req,res)=>res.json(matches));

app.post("/api/admin/match",isAdmin,(req,res)=>{
  const {a,b} = req.body;
  matches.push({
    id: matchId++,
    a, b,
    status:"open",
    pool:{a:0,b:0,draw:0},
    odds:{a:2,b:2,draw:3}
  });
  res.json({ok:true});
});

app.post("/api/bet",(req,res)=>{
  const u = users.find(x=>x.login===req.session.user);
  if(!u) return res.status(401).json({error:"Nie zalogowany"});

  let {matchId,team,amount} = req.body;
  amount = Number(amount);

  if(amount<=0) return res.status(400).json({error:"Zła kwota"});

  const m = matches.find(x=>x.id===Number(matchId));
  if(!m || m.status!=="open")
    return res.status(400).json({error:"Mecz zamknięty"});

  if(u.saldo < amount)
    return res.status(400).json({error:"Brak środków"});

  u.saldo -= amount;
  m.pool[team] += amount;

  const total = m.pool.a + m.pool.b + m.pool.draw;
  m.odds.a = total / (m.pool.a||1);
  m.odds.b = total / (m.pool.b||1);
  m.odds.draw = total / (m.pool.draw||1);

  bets.push({user:u.login,matchId:m.id,team,amount});
  res.json({ok:true});
});

app.post("/api/admin/finish",isAdmin,(req,res)=>{
  const {id,result} = req.body;
  const m = matches.find(x=>x.id===id);
  if(!m) return res.status(404).json({error:"Brak meczu"});
  m.status="finished";

  bets.filter(b=>b.matchId===id && b.team===result)
    .forEach(b=>{
      const u = users.find(x=>x.login===b.user);
      u.saldo += b.amount * m.odds[result];
    });

  res.json({ok:true});
});

/* ===== ADMIN SALDO ===== */

app.get("/api/admin/users",isAdmin,(req,res)=>res.json(users));

app.post("/api/admin/saldo",isAdmin,(req,res)=>{
  const {login,saldo} = req.body;
  const u = users.find(x=>x.login===login);
  if(!u) return res.status(404).json({error:"Brak usera"});
  u.saldo = Number(saldo);
  res.json({ok:true});
});

/* ===== STATIC ===== */

app.use(express.static(path.join(__dirname,"../public")));
app.listen(3000,()=>console.log("ONLINE"));
