const express = require("express");
const { getAllHandlers, paginatedHandlers } = require("../controllers/filesController");

const router = express.Router();

// GET ALL
router.get("/nacional/getAll", getAllHandlers.relatoriosNacional);
router.get("/internacional/getAll", getAllHandlers.relatoriosInternacional);
router.get("/cripto/getAll", getAllHandlers.relatoriosCripto);
router.get("/artigos/getAll", getAllHandlers.artigos);

// PAGINATED
router.get("/nacional", paginatedHandlers.relatoriosNacional);
router.get("/internacional", paginatedHandlers.relatoriosInternacional);
router.get("/cripto", paginatedHandlers.relatoriosCripto);
router.get("/artigos", paginatedHandlers.artigos);

module.exports = router;
