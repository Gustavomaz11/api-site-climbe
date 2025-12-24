const express = require("express");
const { google } = require("googleapis");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Autenticação Google
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(
    fs.readFileSync("./service-account.json", "utf8")
  ),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});

const drive = google.drive({
  version: "v3",
  auth,
});

// Endpoint que retorna os arquivos da pasta
app.get("/api/arquivos", async (req, res) => {
  try {
    const PASTA_ID = "1nBk343RUHKeUlxH_x7RAG7JK7nN5bFis";

    const response = await drive.files.list({
      q: `'${PASTA_ID}' in parents and trashed = false`,
      fields:
        "files(id, name, mimeType, webViewLink, webContentLink, createdTime)",
      orderBy: "createdTime desc",
    });

    res.json(response.data.files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao buscar arquivos do Drive" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
