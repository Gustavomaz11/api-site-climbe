const { listarTodosArquivos, listarArquivosPaginado } = require("../services/driveService");
const { ordenarAtasPorDataNoTitulo, ordenarAlfabeticoCrescente } = require("../utils/sort");
const { paginarEmMemoria } = require("../utils/pagination");
const FOLDERS = require("../config/folders");

function handleError(res, err, message) {
  console.error(err);
  return res.status(500).json({ error: message });
}

function createGetAllHandler(folderId, options = {}, errorMessage = "Erro ao buscar arquivos") {
  return async (req, res) => {
    try {
      const arquivos = await listarTodosArquivos(folderId, options);
      return res.json({
        arquivos,
        totalItems: arquivos.length,
        totalPages: 1,
        pageSize: arquivos.length,
      });
    } catch (err) {
      return handleError(res, err, errorMessage);
    }
  };
}

function createPaginatedHandler(folderId, options = {}, errorMessage = "Erro ao buscar arquivos") {
  return async (req, res) => {
    try {
      const result = await listarArquivosPaginado(folderId, req.query.pageToken, options);
      return res.json(result);
    } catch (err) {
      return handleError(res, err, errorMessage);
    }
  };
}

async function atasReunioesGetAll(req, res) {
  try {
    const arquivos = await listarTodosArquivos(FOLDERS.ATAS_REUNIOES, {
      sortFn: ordenarAtasPorDataNoTitulo,
    });

    return res.json({
      arquivos,
      totalItems: arquivos.length,
      totalPages: 1,
      pageSize: arquivos.length,
    });
  } catch (err) {
    return handleError(res, err, "Erro ao buscar arquivos");
  }
}

async function atasReunioesPaginado(req, res) {
  try {
    const PAGE_SIZE = 15;
    const arquivos = await listarTodosArquivos(FOLDERS.ATAS_REUNIOES, {
      sortFn: ordenarAtasPorDataNoTitulo,
    });

    const result = paginarEmMemoria(arquivos, PAGE_SIZE, req.query.pageToken);

    return res.json({
      arquivos: result.items,
      nextPageToken: result.nextPageToken,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      pageSize: result.pageSize,
      currentPage: result.currentPage,
    });
  } catch (err) {
    return handleError(res, err, "Erro ao buscar arquivos");
  }
}

// Handlers prontos para uso nas rotas
const getAllHandlers = {
  acordoSocios: createGetAllHandler(FOLDERS.ACORDO_SOCIOS),
  contratoSocial: createGetAllHandler(FOLDERS.CONTRATO_SOCIAL),
  educacaoContinua: createGetAllHandler(FOLDERS.EDUCACAO_CONTINUA),
  nps: createGetAllHandler(FOLDERS.NPS),
  resultados: createGetAllHandler(FOLDERS.RESULTADOS),
  balancoPatrimonial: createGetAllHandler(FOLDERS.BALANCO_PATRIMONIAL),
  planejamentoEstrategico: createGetAllHandler(FOLDERS.PLANEJAMENTO_ESTRATEGICO),
  nossoValuation: createGetAllHandler(FOLDERS.NOSSO_VALUATION),
  compliance: createGetAllHandler(FOLDERS.COMPLIANCE),
  relatoriosNacional: createGetAllHandler(
    FOLDERS.RELATORIOS_NACIONAL,
    {},
    "Erro ao buscar arquivos nacionais"
  ),
  relatoriosInternacional: createGetAllHandler(
    FOLDERS.RELATORIOS_INTERNACIONAL,
    {},
    "Erro ao buscar arquivos"
  ),
  relatoriosCripto: createGetAllHandler(
    FOLDERS.RELATORIOS_CRIPTO,
    {},
    "Erro ao buscar arquivos"
  ),
  artigos: createGetAllHandler(FOLDERS.ARTIGOS, {
    orderBy: "name",
    sortFn: ordenarAlfabeticoCrescente,
  }),
};

const paginatedHandlers = {
  acordoSocios: createPaginatedHandler(FOLDERS.ACORDO_SOCIOS),
  contratoSocial: createPaginatedHandler(FOLDERS.CONTRATO_SOCIAL),
  educacaoContinua: createPaginatedHandler(FOLDERS.EDUCACAO_CONTINUA),
  nps: createPaginatedHandler(FOLDERS.NPS),
  resultados: createPaginatedHandler(FOLDERS.RESULTADOS),
  balancoPatrimonial: createPaginatedHandler(FOLDERS.BALANCO_PATRIMONIAL),
  planejamentoEstrategico: createPaginatedHandler(FOLDERS.PLANEJAMENTO_ESTRATEGICO),
  nossoValuation: createPaginatedHandler(FOLDERS.NOSSO_VALUATION),
  compliance: createPaginatedHandler(FOLDERS.COMPLIANCE),
  atasReunioes: atasReunioesPaginado,
  relatoriosNacional: createPaginatedHandler(
    FOLDERS.RELATORIOS_NACIONAL,
    {},
    "Erro ao buscar arquivos nacionais"
  ),
  relatoriosInternacional: createPaginatedHandler(
    FOLDERS.RELATORIOS_INTERNACIONAL,
    {},
    "Erro ao buscar arquivos internacionais"
  ),
  relatoriosCripto: createPaginatedHandler(
    FOLDERS.RELATORIOS_CRIPTO,
    {},
    "Erro ao buscar arquivos cripto"
  ),
  artigos: createPaginatedHandler(FOLDERS.ARTIGOS, {
    orderBy: "name",
    sortFn: ordenarAlfabeticoCrescente,
  }),
};

module.exports = {
  createGetAllHandler,
  createPaginatedHandler,
  atasReunioesGetAll,
  atasReunioesPaginado,
  getAllHandlers,
  paginatedHandlers,
};
