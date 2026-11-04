const express = require("express");
const { rutaNoEncontrada, manejadorErrores, crearRutaSalud } = require("@caseta/shared");
const { version } = require("../package.json");

// S4. Accesos: validación de códigos, entradas, salidas e historial.
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use(crearRutaSalud("accesos", version));
// Las rutas de este servicio se implementan en la Entrega 6.

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
