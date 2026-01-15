const userBox = document.getElementById("userBox");
const matchesBox = document.getElementById("matches");
const adminPanel = document.getElementById("adminPanel");

let isAdmin = false;

async function me() {
  const r = await fetch("/api/me");
  const d = await r.json();

  if (!d.logged) {
    userBox.innerHTML = `
      <input id="login" placeholder="Login">
      <input id="pass" type="password" placeholder="Hasło">
      <button onclick="login()">Zaloguj</button>
    `;
    return;
  }

  isAdmin = d.admin;

  userBox.innerHTML = `
    ${d.login} | Saldo: ${d.balance}
    <button onclick="logout()">Wyloguj</button>
  `;

  if (isAdmin) adminPanel.style.display = "block";

  loadMatches();
}

async function login() {
  await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: login.value,
      password: pass.value
    })
  });
  me();
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  location.reload();
}

async function loadMatches() {
  const r = await fetch("/api/matches");
  const matches = await r.json();

  matchesBox.innerHTML = "";

  matches.forEach(m => {
    const div = document.createElement("div");
    div.className = "match";

    div.innerHTML = `
      <b>${m.a} vs ${m.b}</b><br>
      Kursy:
      <button onclick="bet(${m.id},'a')">${m.a} (${m.oddsA})</button>
      <button onclick="bet(${m.id},'d')">Remis (${m.oddsD})</button>
      <button onclick="bet(${m.id},'b')">${m.b} (${m.oddsB})</button>
    `;

    if (isAdmin) {
      div.innerHTML += `
        <br><br>
        <button onclick="finish(${m.id},'a')">Wygrał A</button>
        <button onclick="finish(${m.id},'d')">Remis</button>
        <button onclick="finish(${m.id},'b')">Wygrał B</button>
        <button onclick="cancel(${m.id})">Anuluj</button>
      `;
    }

    matchesBox.appendChild(div);
  });
}

async function bet(id, pick) {
  const amount = prompt("Kwota:");
  await fetch("/api/bet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matchId: id, pick, amount })
  });
  me();
}

async function finish(id, result) {
  await fetch("/api/admin/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, result })
  });
  loadMatches();
}

async function cancel(id) {
  await fetch("/api/admin/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  loadMatches();
}

async function addMatch() {
  await fetch("/api/admin/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      a: document.getElementById("a").value,
      b: document.getElementById("b").value
    })
  });
  loadMatches();
}

async function setBalance() {
  await fetch("/api/admin/balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: balLogin.value,
      balance: balAmount.value
    })
  });
  alert("Zmieniono saldo");
}

me();
