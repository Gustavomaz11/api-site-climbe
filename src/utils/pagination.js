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

module.exports = { encodePageToken, decodePageToken, paginarEmMemoria };
