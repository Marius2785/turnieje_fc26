const app = document.getElementById("app");

async function checkLogin() {
  const res = await fetch("/api/me");
  const data = await res.json();

  if (!data.logged) {
    showLogin();
  } else {
    showPanel(data);
  }
}

function showLogin() {
  app.innerHTML = `
    <h1>Turnieje FC 26</h1>
    <input id="login" placeholder="Login">
    <input id="password" type="password" placeholder="Hasło">
    <button onclick="login()">Zaloguj</button>
    <p id="error"></p>
  `;
}

async function login() {
  const login = document.getElementById("login").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password })
  });

  if (!res.ok) {
    document.getElementById("error").innerText = "Błędne dane";
    return;
  }

  checkLogin();
}

function showPanel(user) {
  app.innerHTML = `
    <h1>Witaj ${user.login}</h1>
    <p>Saldo: 1000 💰</p>
    ${user.admin ? "<b>PANEL ADMINA</b>" : ""}
    <br><br>
    <button onclick="logout()">Wyloguj</button>
  `;
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  checkLogin();
}

checkLogin();
