async function api(url, data) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return r.json();
}

async function loginUser() {
  const res = await api("/api/login", {
    login: login.value,
    password: password.value
  });
  if (res.error) msg.innerText = res.error;
  else load();
}

async function registerUser() {
  const res = await api("/api/register", {
    login: rlogin.value,
    password: rpassword.value
  });
  msg.innerText = res.ok ? "Zarejestrowano" : res.error;
}

async function logout() {
  await api("/api/logout", {});
  location.reload();
}

async function load() {
  const meRes = await fetch("/api/me").then(r => r.json());
  if (!meRes.logged) return;

  auth.style.display = "none";
  panel.style.display = "block";
  me.innerText = `${meRes.login} | ${meRes.balance} 💰`;

  const matches = await fetch("/api/matches").then(r => r.json());
  matchesDiv.innerHTML = matches.map(m => `
    <div class="card">
      <b>${m.a} vs ${m.b}</b><br>
      <button onclick="bet(${m.id},'a')">${m.a} (${m.oddsA})</button>
      <button onclick="bet(${m.id},'d')">Remis (${m.oddsD})</button>
      <button onclick="bet(${m.id},'b')">${m.b} (${m.oddsB})</button>
    </div>
  `).join("");

  if (meRes.admin) {
    admin.innerHTML = `
      <h3>ADMIN</h3>
      <input id="a"><input id="b">
      <input id="oa" placeholder="A"><input id="od" placeholder="D"><input id="ob" placeholder="B">
      <button onclick="addMatch()">Dodaj mecz</button>
    `;
  }
}

async function bet(id, pick) {
  const amount = prompt("Kwota");
  await api("/api/bet", { matchId: id, pick, amount: +amount });
  load();
}

async function addMatch() {
  await api("/api/admin/match", {
    a: a.value,
    b: b.value,
    oddsA: oa.value,
    oddsD: od.value,
    oddsB: ob.value
  });
  load();
}

load();
