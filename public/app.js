document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const logoutBtn = document.getElementById("logout");

  if (loginForm) {
    loginForm.addEventListener("submit", async e => {
      e.preventDefault();

      const login = document.getElementById("login").value;
      const password = document.getElementById("password").value;

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Błąd logowania");
      } else {
        location.reload();
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async e => {
      e.preventDefault();

      const login = document.getElementById("reg-login").value;
      const password = document.getElementById("reg-password").value;

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Błąd rejestracji");
      } else {
        alert("Konto utworzone – możesz się zalogować");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST" });
      location.reload();
    });
  }
});
