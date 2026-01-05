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

module.exports = {
  ordenarAtasPorDataNoTitulo,
  ordenarPorTrimestre,
  ordenarAlfabeticoCrescente,
};
