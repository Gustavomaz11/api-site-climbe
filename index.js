require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "https://climbe.com.br",
  "https://www.climbe.com.br",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
  "https://climbei.netlify.app",
];

// CORS
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS não permitido para esta origem"));
      }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ===== Ordenar Atas por data no título (dd/MM/yyyy) =====
function ordenarAtasPorDataNoTitulo(arquivos) {
  return arquivos.sort((a, b) => {
    const regexData = /(\d{2})\/(\d{2})\/(\d{4})/;

    const matchA = a.name?.match(regexData);
    const matchB = b.name?.match(regexData);

    if (!matchA && !matchB) return 0;

    if (!matchA) return 1;
    if (!matchB) return -1;

    const [, diaA, mesA, anoA] = matchA;
    const [, diaB, mesB, anoB] = matchB;

    const dateA = new Date(`${anoA}-${mesA}-${diaA}`);
    const dateB = new Date(`${anoB}-${mesB}-${diaB}`);

    return dateB - dateA;
  });
}

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

// ===== Função de Ordenação por Trimestre =====
function ordenarPorTrimestre(arquivos) {
  return arquivos.sort((a, b) => {
    const nameA = a.name || "";
    const nameB = b.name || "";

    const quarterRegex = /(\d)T(\d{2,4})/i;

    const matchA = nameA.match(quarterRegex);
    const matchB = nameB.match(quarterRegex);

    if (!matchA && !matchB) return 0;

    if (!matchA) return 1;
    if (!matchB) return -1;

    const quarterA = parseInt(matchA[1], 10);
    const yearA = parseInt(matchA[2], 10);
    const quarterB = parseInt(matchB[1], 10);
    const yearB = parseInt(matchB[2], 10);

    const fullYearA = yearA < 100 ? 2000 + yearA : yearA;
    const fullYearB = yearB < 100 ? 2000 + yearB : yearB;

    if (fullYearA !== fullYearB) return fullYearB - fullYearA;
    return quarterB - quarterA;
  });
}

// ===== Ordenar alfabeticamente (crescente) =====
function ordenarAlfabeticoCrescente(arquivos) {
  return arquivos.sort((a, b) => {
    const nameA = (a.name || "").trim();
    const nameB = (b.name || "").trim();
    return nameA.localeCompare(nameB, "pt-BR", {
      sensitivity: "base",
      numeric: true,
    });
  });
}

// ===== PageToken baseado em offset (para paginação em memória) =====
function encodePageToken(offset) {
  return Buffer.from(String(offset), "utf8").toString("base64");
}
function decodePageToken(token) {
  if (!token) return 0;
  try {
    const decoded = Buffer.from(String(token), "base64").toString("utf8");
    const offset = Number(decoded);
    return Number.isFinite(offset) && offset >= 0 ? offset : 0;
  } catch {
    return 0;
  }
}
function paginarEmMemoria(items, pageSize, pageToken) {
  const offset = decodePageToken(pageToken);
  const start = offset;
  const end = start + pageSize;

  const pageItems = items.slice(start, end);
  const nextOffset = end;

  const nextPageToken = nextOffset < items.length ? encodePageToken(nextOffset) : null;

  const currentPage = Math.floor(start / pageSize) + 1;
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    items: pageItems,
    nextPageToken,
    currentPage,
    totalItems,
    totalPages,
    pageSize,
  };
}

// ===== Contar total de arquivos na pasta =====
async function contarArquivos(folderId) {
  let total = 0;
  let pageToken = null;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id)",
      pageSize: 1000,
      pageToken,
    });

    const files = response.data.files || [];
    total += files.length;
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return total;
}

// ===== GET ALL (sem metadados PDF) =====
async function listarTodosArquivos(folderId) {
  let allFiles = [];
  let pageToken = null;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,webViewLink,webContentLink,createdTime)",
      pageSize: 1000,
      pageToken,
    });

    const files = response.data.files || [];
    allFiles.push(...files);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return ordenarPorTrimestre(allFiles);
}

// ===== Paginado (com totalPages) =====
async function listarArquivosPaginado(folderId, pageToken, options = {}) {
  const PAGE_SIZE = 15;

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "nextPageToken,files(id,name,mimeType,webViewLink,webContentLink,createdTime)",
    pageSize: PAGE_SIZE,
    pageToken: pageToken || null,
    orderBy: options.orderBy || undefined, // ex: "name" para artigos
  });

  let arquivos = response.data.files || [];

  // Ordenação por padrão (trimestre) ou customizada
  if (typeof options.sortFn === "function") {
    arquivos = options.sortFn(arquivos);
  } else {
    arquivos = ordenarPorTrimestre(arquivos);
  }

  const nextPageToken = response.data.nextPageToken || null;

  const totalItems = await contarArquivos(folderId);
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return {
    arquivos,
    nextPageToken,
    totalItems,
    totalPages,
    pageSize: PAGE_SIZE,
  };
}

// ===== Email Routes =====
app.post("/api/contato", async (req, res) => {
  const { nome, email, empresa, mensagem } = req.body;

  if (!nome || !email || !empresa || !mensagem) {
    return res.status(400).json({ error: "Dados obrigatórios ausentes" });
  }

  try {
    await mailTransporter.sendMail({
      from: `"Site Climbe" <${process.env.SMTP_USER}>`,
      to: "contato@climbe.com.br",
      subject: "Novo contato via site",
      html: `
        <h2>Novo contato recebido</h2>
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Empresa:</strong> ${empresa}</p>
        <p><strong>Mensagem:</strong></p>
        <p>${mensagem}</p>
      `,
    });

    await mailTransporter.sendMail({
      from: `"Climbe" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Recebemos sua mensagem",
      html: `
        <p>Olá, ${nome}!</p>
        <p>Recebemos sua mensagem e em breve um representante da <strong>Climbe</strong> fará contato.</p>
        <p>Atenciosamente,<br/>Equipe Climbe</p>
      `,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
});

app.post("/api/newsletter", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email é obrigatório" });
  }

  try {
    await mailTransporter.sendMail({
      from: `"Site Climbe" <${process.env.SMTP_USER}>`,
      to: "contato@climbe.com.br",
      subject: "Novo cadastro de interesse",
      html: `
        <p>Um novo usuário demonstrou interesse:</p>
        <p><strong>Email:</strong> ${email}</p>
      `,
    });

    await mailTransporter.sendMail({
      from: `"Climbe" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Obrigado pelo seu interesse",
      html: `
        <p>Olá!</p>
        <p>Obrigado por entrar em contato com a <strong>Climbe</strong>.</p>
        <p>Em breve nossa equipe falará com você.</p>
      `,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    res.status(500).json({ error: "Erro ao enviar email" });
  }
});

// ===== GET ALL Routes =====
app.get("/api/ri/acordoSocios/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_ACORDO_SOCIOS);
    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar todos os arquivos" });
  }
});

app.get("/api/ri/contratoSocial/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_CONTRATO_SOCIAL);
    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/educacaoContinua/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_EDUCACAO_CONTINUA);
    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/nps/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_NPS);
    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/resultados/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_RESULTADOS);
    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/balancoPatrimonial/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_BALANCO_PATRIMONIAL);
    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/planejamentoEstrategico/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_PLANEJAMENTO_ESTRATEGICO);
    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/nossoValuation/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_NOSSO_VALUATION);
    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/compliance/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_COMPLIANCE);
    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/atasReunioes/getAll", async (req, res) => {
  try {
    let arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_ATAS_REUNIOES);
    arquivos = ordenarAtasPorDataNoTitulo(arquivos);

    res.json({
      arquivos,
      totalItems: arquivos.length,
      totalPages: 1,
      pageSize: arquivos.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/arquivos/nacional/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_ID);
    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});

app.get("/api/arquivos/internacional/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_INTERNACIONAL);
    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/arquivos/cripto/getAll", async (req, res) => {
  try {
    const arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_CRIPTO);
    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/arquivos/artigos/getAll", async (req, res) => {
  try {
    
    let arquivos = [];
    let pageToken = null;

    do {
      const response = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER_ARTIGO}' in parents and trashed = false`,
        fields: "nextPageToken,files(id,name,mimeType,webViewLink,webContentLink,createdTime)",
        pageSize: 1000,
        pageToken,
        orderBy: "name", // A -> Z
      });

      arquivos.push(...(response.data.files || []));
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    arquivos = ordenarAlfabeticoCrescente(arquivos);

    res.json({ arquivos, totalItems: arquivos.length, totalPages: 1, pageSize: arquivos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

// ===== Relação com Investidores - Paginado =====
app.get("/api/ri/acordoSocios", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(process.env.GOOGLE_DRIVE_FOLDER_ACORDO_SOCIOS, req.query.pageToken);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/contratoSocial", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(process.env.GOOGLE_DRIVE_FOLDER_CONTRATO_SOCIAL, req.query.pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/educacaoContinua", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(process.env.GOOGLE_DRIVE_FOLDER_EDUCACAO_CONTINUA, req.query.pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/nps", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(process.env.GOOGLE_DRIVE_FOLDER_NPS, req.query.pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/resultados", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(process.env.GOOGLE_DRIVE_FOLDER_RESULTADOS, req.query.pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/balancoPatrimonial", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(process.env.GOOGLE_DRIVE_FOLDER_BALANCO_PATRIMONIAL, req.query.pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/planejamentoEstrategico", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(process.env.GOOGLE_DRIVE_FOLDER_PLANEJAMENTO_ESTRATEGICO, req.query.pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/nossoValuation", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(process.env.GOOGLE_DRIVE_FOLDER_NOSSO_VALUATION, req.query.pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/compliance", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(process.env.GOOGLE_DRIVE_FOLDER_COMPLIANCE, req.query.pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

app.get("/api/ri/atasReunioes", async (req, res) => {
  try {
    const PAGE_SIZE = 15;

    let arquivos = await listarTodosArquivos(process.env.GOOGLE_DRIVE_FOLDER_ATAS_REUNIOES);
    arquivos = ordenarAtasPorDataNoTitulo(arquivos);

    const result = paginarEmMemoria(arquivos, PAGE_SIZE, req.query.pageToken);

    res.json({
      arquivos: result.items,
      nextPageToken: result.nextPageToken,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      pageSize: result.pageSize,
      currentPage: result.currentPage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar arquivos" });
  }
});

// ===== Relatórios - Paginado =====
app.get("/api/arquivos/nacional", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(process.env.GOOGLE_DRIVE_FOLDER_ID, req.query.pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos nacionais" });
  }
});

app.get("/api/arquivos/internacional", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(process.env.GOOGLE_DRIVE_FOLDER_INTERNACIONAL, req.query.pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos internacionais" });
  }
});

app.get("/api/arquivos/cripto", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(process.env.GOOGLE_DRIVE_FOLDER_CRIPTO, req.query.pageToken);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar arquivos cripto" });
  }
});

app.get("/api/arquivos/artigos", async (req, res) => {
  try {
    const result = await listarArquivosPaginado(
      process.env.GOOGLE_DRIVE_FOLDER_ARTIGO,
      req.query.pageToken,
      {
        orderBy: "name", 
        sortFn: ordenarAlfabeticoCrescente, 
      }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar artigos" });
  }
});

app.listen(PORT, () => {
  console.log(`API rodando com sucesso!`);
});
