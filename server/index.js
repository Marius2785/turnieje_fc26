import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.use(session({
  secret: "fc26-secret",
  resave: false,
  saveUninitialized: false
}));

/* ====== DANE ====== */
let users = [
  { id:1, login:"administracja", password:"marionetkituska", saldo:9999, admin:true }
];

let matches = [];
let bets = [];
let matchId = 1;

/* ====== AUTH ====== */
app.post("/api/register",(req,res)=>{
  const {login,password}=req.body;
  if(users.find(u=>u.login===login))
    return res.status(400).json({error:"Login zajęty"});
  users.push({id:Date.now(),login,password,saldo:1000,admin:false});
  res.json({ok:true});
});

app.post("/api/login",(req,res)=>{
  const u = users.find(u=>u.login===req.body.login && u.password===req.body.password);
  if(!u) return res.status(400).json({error:"Złe dane logowania"});
  req.session.user=u.id;
  res.json({ok:true});
});

app.post("/api/logout",(req,res)=>{
  req.session.destroy(()=>res.json({ok:true}));
});

app.get("/api/me",(req,res)=>{
  const u = users.find(u=>u.id===req.session.user);
  if(!u) return res.json({logged:false});
  res.json({logged:true,login:u.login,saldo:u.saldo,admin:u.admin});
});

/* ====== MECZE ====== */
app.get("/api/matches",(req,res)=>res.json(matches));

app.post("/api/bet",(req,res)=>{
  const u = users.find(u=>u.id===req.session.user);
  if(!u) return res.status(401).json({error:"Nie zalogowany"});
  const {matchId,team,amount}=req.body;
  if(u.saldo<amount) return res.status(400).json({error:"Brak środków"});
  u.saldo-=amount;
  bets.push({user:u.id,matchId,team,amount});
  res.json({ok:true});
});

/* ====== ADMIN ====== */
function admin(req,res,next){
  const u = users.find(u=>u.id===req.session.user);
  if(!u||!u.admin) return res.status(403).json({error:"Brak uprawnień"});
  next();
}

app.post("/api/admin/match",admin,(req,res)=>{
  matches.push({
    id:matchId++,
    a:req.body.a,
    b:req.body.b,
    odds:{a:2.0,b:2.0,draw:3.0},
    status:"open"
  });
  res.json({ok:true});
});

app.post("/api/admin/finish",admin,(req,res)=>{
  const m = matches.find(m=>m.id===req.body.id);
  if(!m||m.status!=="open") return res.json({ok:false});
  m.status="finished";
  const result=req.body.result;
  bets.filter(b=>b.matchId===m.id).forEach(b=>{
    if(b.team===result){
      const u=users.find(u=>u.id===b.user);
      u.saldo+=b.amount*m.odds[result];
    }
  });
  res.json({ok:true});
});

app.post("/api/admin/cancel",admin,(req,res)=>{
  const m = matches.find(m=>m.id===req.body.id);
  if(!m) return res.json({ok:false});
  m.status="cancelled";
  bets.filter(b=>b.matchId===m.id).forEach(b=>{
    const u=users.find(u=>u.id===b.user);
    u.saldo+=b.amount;
  });
  res.json({ok:true});
});

app.post("/api/admin/saldo",admin,(req,res)=>{
  const u=users.find(u=>u.login===req.body.login);
  if(u) u.saldo=req.body.saldo;
  res.json({ok:true});
});

app.listen(process.env.PORT||3000,()=>console.log("ONLINE"));
