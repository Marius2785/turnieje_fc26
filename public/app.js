async function load() {
  const me = await fetch("/api/me").then(r => r.json());
  if (!me.logged) return;

  const matches = await fetch("/api/matches").then(r => r.json());
  const tbody = document.querySelector("tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  matches.forEach(m => {
    const oddsA = m.oddsA ?? 2.5;
    const oddsD = m.oddsD ?? 2.5;
    const oddsB = m.oddsB ?? 2.5;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.a}<br>vs<br>${m.b}</td>
      <td>-</td>
      <td>-</td>
      <td>
        <span class="kurs">1 ${oddsA}</span>
        <span class="kurs">X ${oddsD}</span>
        <span class="kurs">2 ${oddsB}</span>
      </td>
      <td>
        ${me.admin ? `
          <button class="btn green" onclick="finish(${m.id},'a')">1</button>
          <button class="btn yellow" onclick="finish(${m.id},'d')">X</button>
          <button class="btn red" onclick="finish(${m.id},'b')">2</button>
        ` : ""}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function finish(id, r) {
  await fetch("/api/admin/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, result: r })
  });
  load();
}

load();
