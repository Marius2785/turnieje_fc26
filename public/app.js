async function api(url, data){
  const r = await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(data)
  });
  return r.json();
}

async function loginUser(){
  const res = await api("/api/login",{
    login:login.value,
    password:password.value
  });
  msg.innerText = res.error || "Zalogowano";
  load();
}

async function registerUser(){
  const res = await api("/api/register",{
    login:rlogin.value,
    password:rpassword.value
  });
  msg.innerText = res.error || "Zarejestrowano";
}

async function logout(){
  await api("/api/logout",{});
  load();
}

async function load(){
  const me = await fetch("/api/me").then(r=>r.json());

  if(!me.logged){
    auth.style.display="block";
    panel.style.display="none";
    return;
  }

  auth.style.display="none";
  panel.style.display="block";
  me.innerText = `${me.login} | Saldo: ${me.balance} 💰`;

  const matches = await fetch("/api/matches").then(r=>r.json());
  matchesDiv.innerHTML = matches.map(m=>`
    <div class="card match">
      <b>${m.a} vs ${m.b}</b><br>
      <button onclick="bet(${m.id},'a')">${m.a} (${m.oddsA})</button>
      <button onclick="bet(${m.id},'d')">Remis (${m.oddsD})</button>
      <button onclick="bet(${m.id},'b')">${m.b} (${m.oddsB})</button>
    </div>
  `).join("");

  if(me.admin){
    admin.innerHTML = `
      <div class="card">
        <h3>Admin</h3>
        <input id="a" placeholder="Gracz A">
        <input id="b" placeholder="Gracz B">
        <input id="oa" placeholder="Kurs A">
        <input id="od" placeholder="Kurs Remis">
        <input id="ob" placeholder="Kurs B">
        <button onclick="addMatch()">Dodaj mecz</button>
      </div>
    `;
  }
}

async function bet(id,pick){
  const amount = +prompt("Kwota");
  await api("/api/bet",{matchId:id,pick,amount});
  load();
}

async function addMatch(){
  await api("/api/admin/match",{
    a:a.value,
    b:b.value,
    oddsA:+oa.value,
    oddsD:+od.value,
    oddsB:+ob.value
  });
  load();
}

load();
