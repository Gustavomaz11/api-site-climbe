require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const pdfParse = require("pdf-parse");

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "https://climbe.com.br",
  "https://www.climbe.com.br",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "https://climbei.netlify.app"
];

// CORS
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

async function listarTodosArquivosComMetadados(folderId) {
  let allFiles = [];
  let pageToken = null;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields:
        "nextPageToken,files(id,name,mimeType,webViewLink,webContentLink,createdTime)",
      orderBy: "createdTime desc",
      pageSize: 1000, // máximo permitido pela API
      pageToken,
    });

    const files = response.data.files || [];

    allFiles.push(...files);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  // Extrai metadados PDF
  await Promise.all(
    allFiles.map(async (file) => {
      if (file.mimeType === "application/pdf") {
        file.pdf_metadata = await getPdfMetadata(file.id);
      } else {
        file.pdf_metadata = null;
      }
    })
  );

  return allFiles;
}

async function listarArquivosComMetadados(folderId, pageToken) {
  const PAGE_SIZE = 15;

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields:
      "nextPageToken,files(id,name,mimeType,webViewLink,webContentLink,createdTime)",
    orderBy: "createdTime desc",
    pageSize: PAGE_SIZE,
    pageToken: pageToken || null,
  });

  const arquivos = response.data.files || [];

  // Extrai metadados PDF em paralelo limitado
  await Promise.all(
    arquivos.map(async (file) => {
      if (file.mimeType === "application/pdf") {
        file.pdf_metadata = await getPdfMetadata(file.id);
      } else {
        file.pdf_metadata = null;
      }
    })
  );

  return { arquivos, nextPageToken: response.data.nextPageToken || null };
}

// GET ALL
app.get("/api/ri/acordoSocios/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_ACORDO_SOCIOS
    );
    res.json({ arquivos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar todos os arquivos" });
  }
});

app.get("/api/ri/contratoSocial/getAll", async (req, res) => {
  res.json({
    arquivos: await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_CONTRATO_SOCIAL
    )
  });
});

app.get("/api/ri/educacaoContinua/getAll", async (req, res) => {
  res.json({
    arquivos: await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_EDUCACAO_CONTINUA
    )
  });
});

app.get("/api/ri/nps/getAll", async (req, res) => {
  res.json({
    arquivos: await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_NPS
    )
  });
});

app.get("/api/ri/resultados/getAll", async (req, res) => {
  res.json({
    arquivos: await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_RESULTADOS
    )
  });
});

app.get("/api/ri/balancoPatrimonial/getAll", async (req, res) => {
  res.json({
    arquivos: await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_BALANCO_PATRIMONIAL
    )
  });
});

app.get("/api/ri/planejamentoEstrategico/getAll", async (req, res) => {
  res.json({
    arquivos: await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_PLANEJAMENTO_ESTRATEGICO
    )
  });
});

app.get("/api/ri/nossoValuation/getAll", async (req, res) => {
  res.json({
    arquivos: await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_NOSSO_VALUATION
    )
  });
});

app.get("/api/ri/compliance/getAll", async (req, res) => {
  res.json({
    arquivos: await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_COMPLIANCE
    )
  });
});

app.get("/api/ri/atasReunioes/getAll", async (req, res) => {
  res.json({
    arquivos: await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_ATAS_REUNIOES
    )
  });
});

app.get("/api/arquivos/nacional/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_ID
    );
    res.json({ arquivos });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});

app.get("/api/arquivos/internacional/getAll", async (req, res) => {
  res.json({
    arquivos: await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_INTERNACIONAL
    )
  });
});

app.get("/api/arquivos/cripto/getAll", async (req, res) => {
  res.json({
    arquivos: await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_CRIPTO
    )
  });
});

app.get("/api/arquivos/artigos/getAll", async (req, res) => {
  res.json({
    arquivos: await listarTodosArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_ARTIGO
    )
  });
});


// =====================

async function getPdfMetadata(fileId) {
  try {
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(response.data);

    const parser = pdfParse.default || pdfParse;
    const data = await parser(buffer);

    return {
      author: data.info?.Author || null,
      title: data.info?.Title || null,
      producer: data.info?.Producer || null,
      creator: data.info?.Creator || null,
      pdf_version: data.info?.PDFFormatVersion || null,
      create_date: data.info?.CreationDate || null,
      modify_date: data.info?.ModDate || null,
      page_count: data.numpages || null,
    };
  } catch (err) {
    console.error("Erro ao ler PDF:", err.message);
    return null;
  }
}

// ===== Relação com Investidores =====
app.get("/api/ri/acordoSocios", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_ACORDO_SOCIOS,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});


app.get("/api/ri/contratoSocial", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_CONTRATO_SOCIAL,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});


app.get("/api/ri/educacaoContinua", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_EDUCACAO_CONTINUA,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});


app.get("/api/ri/nps", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_NPS,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});

app.get("/api/ri/resultados", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_RESULTADOS,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});

app.get("/api/ri/balancoPatrimonial", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_BALANCO_PATRIMONIAL,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});

app.get("/api/ri/planejamentoEstrategico", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_PLANEJAMENTO_ESTRATEGICO,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});

app.get("/api/ri/nossoValuation", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_NOSSO_VALUATION,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});

app.get("/api/ri/compliance", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_COMPLIANCE,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});

app.get("/api/ri/atasReunioes", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_ATAS_REUNIOES,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});

// ===== Relatórios =====
app.get("/api/arquivos/nacional", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_ID,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});

app.get("/api/arquivos/internacional", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_INTERNACIONAL,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Erro ao buscar arquivos internacionais" });
  }
});

app.get("/api/arquivos/cripto", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_CRIPTO,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos cripto" });
  }
});

// ==== Artigos =====
app.get("/api/arquivos/artigos", async (req, res) => {
  try {
    const result = await listarArquivosComMetadados(
      process.env.GOOGLE_DRIVE_FOLDER_ARTIGO,
      req.query.pageToken
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar artigos" });
  }
});

app.listen(PORT, () => {
  console.log(`API rodando com sucesso!`);
});
