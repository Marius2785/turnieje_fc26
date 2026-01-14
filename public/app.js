const msg = document.getElementById("msg");

async function api(url, data) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return r.json();
}

async function login() {
  const r = await api("/api/login",{login:login.value,password:password.value});
  if(r.error) msg.innerText=r.error; else load();
}

async function register() {
  const r = await api("/api/register",{login:rlogin.value,password:rpassword.value});
  msg.innerText = r.error || "Zarejestrowano";
}

async function logout(){ await api("/api/logout",{}); load(); }

async function load(){
  const me = await fetch("/api/me").then(r=>r.json());
  if(!me.logged){
    auth.style.display="block";
    panel.style.display="none";
    return;
  }

  auth.style.display="none";
  panel.style.display="block";
  document.getElementById("me").innerText =
    `${me.login} | ${me.balance} 💰`;

  const matches = await fetch("/api/matches").then(r=>r.json());
  matchesDiv.innerHTML = matches.map(m=>`
    <div>
      <b>${m.a} vs ${m.b}</b><br>
      <button onclick="bet(${m.id},'a')">${m.a} (${m.oddsA})</button>
      <button onclick="bet(${m.id},'d')">Remis (${m.oddsD})</button>
      <button onclick="bet(${m.id},'b')">${m.b} (${m.oddsB})</button>
    </div>
  `).join("");

  if(me.admin){
    admin.innerHTML = `
      <h3>Admin</h3>
      <input id="a" placeholder="A">
      <input id="b" placeholder="B">
      <input id="oa" placeholder="kurs A">
      <input id="od" placeholder="kurs D">
      <input id="ob" placeholder="kurs B">
      <button onclick="addMatch()">Dodaj</button>

      <input id="mid" placeholder="ID meczu">
      <select id="res">
        <option value="a">A</option>
        <option value="d">Remis</option>
        <option value="b">B</option>
      </select>
      <button onclick="finish()">Zakończ</button>

      <h4>Saldo</h4>
      <input id="ul" placeholder="login">
      <input id="ub" placeholder="saldo">
      <button onclick="setBal()">Zapisz</button>
    `;
  }
}

async function bet(id,p){
  const a = prompt("Kwota");
  await api("/api/bet",{matchId:id,pick:p,amount:+a});
  load();
}

async function addMatch(){
  await api("/api/admin/match",{
    a:a.value,b:b.value,
    oddsA:+oa.value,oddsD:+od.value,oddsB:+ob.value
  });
  load();
}

async function finish(){
  await api("/api/admin/finish",{id:+mid.value,result:res.value});
  load();
}

async function setBal(){
  await api("/api/admin/balance",{login:ul.value,amount:+ub.value});
  load();
}

load();
