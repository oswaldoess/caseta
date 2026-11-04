const express = require("express");
const { rutaNoEncontrada, manejadorErrores, crearRutaSalud } = require("@caseta/shared");
const { version } = require("../package.json");

// S5. Reglas y Adeudos: adeudos y parámetros del reglamento.
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use(crearRutaSalud("reglas", version));
// Las rutas de este servicio se implementan en la Entrega 6.

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
