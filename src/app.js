const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const { corsOptions } = require("./config/cors");

const app = express();

app.use(express.json());
app.use(cors(corsOptions));
app.use(routes);

module.exports = app;
