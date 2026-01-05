const express = require("express");
const contactRoutes = require("./contactRoutes");
const riRoutes = require("./riRoutes");
const arquivoRoutes = require("./arquivoRoutes");

const router = express.Router();

router.use(contactRoutes);
router.use("/api/ri", riRoutes);
router.use("/api/arquivos", arquivoRoutes);

module.exports = router;
