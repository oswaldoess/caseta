const express = require("express");
const { rutaNoEncontrada, manejadorErrores, crearRutaSalud } = require("@caseta/shared");
const { version } = require("../package.json");

// S2. Viviendas: viviendas y asignación de residentes.
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use(crearRutaSalud("viviendas", version));
app.use("/api/v1/viviendas", require("./routes/viviendas.routes"));
// Entrega 6: ruta interna I03 (vivienda y domicilio de un residente) para Visitas.

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
