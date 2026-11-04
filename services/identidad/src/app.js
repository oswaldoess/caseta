const express = require("express");
const { rutaNoEncontrada, manejadorErrores, crearRutaSalud } = require("@caseta/shared");
const { version } = require("../package.json");

// S1. Identidad: usuarios, roles, sesiones y tokens.
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use(crearRutaSalud("identidad", version));
app.use("/api/v1/usuarios", require("./routes/usuarios.routes"));
app.use("/internal/v1", require("./routes/internas.routes"));
// Entrega 6: /api/v1/sesiones (E01, E02), /api/v1/usuarios/me (E03, E04) e I01.

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
