import express from "express";

const app = express();

// ===== STRONA GŁÓWNA =====
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8" />
      <title>Turnieje FC 26</title>
      <style>
        body {
          background: #0f172a;
          color: white;
          font-family: Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .box {
          text-align: center;
          background: #020617;
          padding: 40px;
          border-radius: 14px;
          box-shadow: 0 0 30px rgba(0,0,0,.6);
        }
        h1 {
          margin-bottom: 10px;
        }
        p {
          opacity: 0.8;
        }
        a {
          display: inline-block;
          margin-top: 25px;
          padding: 14px 28px;
          background: #2563eb;
          color: white;
          text-decoration: none;
          border-radius: 10px;
          font-size: 18px;
        }
        a:hover {
          background: #1d4ed8;
        }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>Turnieje FC 26</h1>
        <p>Wirtualne obstawianie meczów (4fun)</p>
        <a href="/auth/discord">Zaloguj przez Discord</a>
      </div>
    </body>
    </html>
  `);
});

// ===== TYMCZASOWY PLACEHOLDER =====
app.get("/auth/discord", (req, res) => {
  res.send("Logowanie Discord będzie dodane w następnym kroku.");
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("ONLINE");
});
