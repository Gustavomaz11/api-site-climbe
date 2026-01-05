const express = require("express");
const { getAllHandlers, paginatedHandlers, atasReunioesGetAll } = require("../controllers/filesController");

const router = express.Router();

// GET ALL
router.get("/acordoSocios/getAll", getAllHandlers.acordoSocios);
router.get("/contratoSocial/getAll", getAllHandlers.contratoSocial);
router.get("/educacaoContinua/getAll", getAllHandlers.educacaoContinua);
router.get("/nps/getAll", getAllHandlers.nps);
router.get("/resultados/getAll", getAllHandlers.resultados);
router.get("/balancoPatrimonial/getAll", getAllHandlers.balancoPatrimonial);
router.get("/planejamentoEstrategico/getAll", getAllHandlers.planejamentoEstrategico);
router.get("/nossoValuation/getAll", getAllHandlers.nossoValuation);
router.get("/compliance/getAll", getAllHandlers.compliance);
router.get("/atasReunioes/getAll", atasReunioesGetAll);

// PAGINATED
router.get("/acordoSocios", paginatedHandlers.acordoSocios);
router.get("/contratoSocial", paginatedHandlers.contratoSocial);
router.get("/educacaoContinua", paginatedHandlers.educacaoContinua);
router.get("/nps", paginatedHandlers.nps);
router.get("/resultados", paginatedHandlers.resultados);
router.get("/balancoPatrimonial", paginatedHandlers.balancoPatrimonial);
router.get("/planejamentoEstrategico", paginatedHandlers.planejamentoEstrategico);
router.get("/nossoValuation", paginatedHandlers.nossoValuation);
router.get("/compliance", paginatedHandlers.compliance);
router.get("/atasReunioes", paginatedHandlers.atasReunioes);

module.exports = router;
