require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;

// Domínios permitidos
const allowedOrigins = [
  "https://climbe.com.br",
  "https://www.climbe.com.br",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500"
];

// Configuração CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Permite chamadas sem origin (Postman, servidor)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS não permitido para esta origem"));
      }
    },
    methods: ["GET"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ===== Google Drive Auth =====
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
  },
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive = google.drive({ version: "v3", auth });

// ===== Endpoint =====
app.get("/api/arquivos/nacional", async (req, res) => {
  try {
    let arquivos = [];
    let pageToken = null;

    do {
      const response = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
        fields:
          "nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, createdTime)",
        orderBy: "createdTime desc",
        pageSize: 100,
        pageToken: pageToken,
      });

      arquivos = arquivos.concat(response.data.files);
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    arquivos.sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime)
    );

    res.json(arquivos);
  } catch (err) {
    console.error("Erro Drive:", err.message);
    res.status(500).json({ error: "Erro ao buscar arquivos do Drive" });
  }
});

app.get("/api/arquivos/nacional", async (req, res) => {
  try {
    let arquivos = [];
    let pageToken = null;

    do {
      const response = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
        fields:
          "nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, createdTime)",
        orderBy: "createdTime desc",
        pageSize: 100,
        pageToken: pageToken,
      });

      arquivos = arquivos.concat(response.data.files);
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    arquivos.sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime)
    );

    res.json(arquivos);
  } catch (err) {
    console.error("Erro Drive:", err.message);
    res.status(500).json({ error: "Erro ao buscar arquivos do Drive" });
  }
});

app.get("/api/arquivos/internacional", async (req, res) => {
  try {
    let arquivos = [];
    let pageToken = null;

    do {
      const response = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER_INTERNACIONAL}' in parents and trashed = false`,
        fields:
          "nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, createdTime)",
        orderBy: "createdTime desc",
        pageSize: 100,
        pageToken: pageToken,
      });

      arquivos = arquivos.concat(response.data.files);
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    arquivos.sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime)
    );

    res.json(arquivos);
  } catch (err) {
    console.error("Erro Drive:", err.message);
    res.status(500).json({ error: "Erro ao buscar arquivos do Drive" });
  }
});

app.get("/api/arquivos/cripto", async (req, res) => {
  try {
    let arquivos = [];
    let pageToken = null;

    do {
      const response = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER_CRIPTO}' in parents and trashed = false`,
        fields:
          "nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, createdTime)",
        orderBy: "createdTime desc",
        pageSize: 100,
        pageToken: pageToken,
      });

      arquivos = arquivos.concat(response.data.files);
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    arquivos.sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime)
    );

    res.json(arquivos);
  } catch (err) {
    console.error("Erro Drive:", err.message);
    res.status(500).json({ error: "Erro ao buscar arquivos do Drive" });
  }
});

app.get("/api/arquivos/artigos", async (req, res) => {
  try {
    let arquivos = [];
    let pageToken = null;

    do {
      const response = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER_ARTIGO}' in parents and trashed = false`,
        fields:
          "nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, createdTime)",
        orderBy: "createdTime desc",
        pageSize: 100,
        pageToken: pageToken,
      });

      arquivos = arquivos.concat(response.data.files);
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    arquivos.sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime)
    );

    res.json(arquivos);
  } catch (err) {
    console.error("Erro Drive:", err.message);
    res.status(500).json({ error: "Erro ao buscar arquivos do Drive" });
  }
});


app.listen(PORT, () => {
  console.log(`API rodando com sucesso!`);
});
