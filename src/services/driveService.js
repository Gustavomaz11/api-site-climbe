const { drive } = require("../config/drive");
const { ordenarPorTrimestre } = require("../utils/sort");

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

async function listarTodosArquivos(folderId, options = {}) {
  const { orderBy, sortFn } = options;
  let allFiles = [];
  let pageToken = null;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,webViewLink,webContentLink,createdTime)",
      pageSize: 1000,
      pageToken,
      orderBy: orderBy || undefined,
    });

    const files = response.data.files || [];
    allFiles.push(...files);
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  if (typeof sortFn === "function") {
    return sortFn(allFiles);
  }

  return ordenarPorTrimestre(allFiles);
}

async function listarArquivosPaginado(folderId, pageToken, options = {}) {
  const PAGE_SIZE = 15;

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "nextPageToken,files(id,name,mimeType,webViewLink,webContentLink,createdTime)",
    pageSize: PAGE_SIZE,
    pageToken: pageToken || null,
    orderBy: options.orderBy || undefined,
  });

  let arquivos = response.data.files || [];

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

module.exports = {
  listarTodosArquivos,
  listarArquivosPaginado,
};
