const express = require("express");
const { rutaNoEncontrada, manejadorErrores, crearRutaSalud } = require("@caseta/shared");
const { version } = require("../package.json");

// S3. Visitas: visitas y códigos de acceso.
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use(crearRutaSalud("visitas", version));
// Las rutas de este servicio se implementan en la Entrega 6.

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
