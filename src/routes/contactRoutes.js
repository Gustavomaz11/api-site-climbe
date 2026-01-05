const express = require("express");
const { contato, newsletter } = require("../controllers/contactController");

const router = express.Router();

router.post("/api/contato", contato);
router.post("/api/newsletter", newsletter);

module.exports = router;
