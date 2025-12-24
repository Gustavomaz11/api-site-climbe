require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");

const app = express();
const PORT = process.env.PORT || 3000;

// Domínios permitidos
const allowedOrigins = [
  "https://climbe.com.br",
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
app.get("/api/arquivos", async (req, res) => {
  try {
    const response = await drive.files.list({
      q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields:
        "files(id, name, mimeType, webViewLink, webContentLink, createdTime)",
      orderBy: "createdTime desc",
    });

    res.json(response.data.files);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Erro ao buscar arquivos do Drive" });
  }
});

app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
