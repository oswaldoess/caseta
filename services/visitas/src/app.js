const express = require("express");
const { rutaNoEncontrada, manejadorErrores, crearRutaSalud, soloDesdeGateway } = require("@caseta/shared");
const { version } = require("../package.json");

// S3. Visitas: visitas y códigos de acceso.
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use(crearRutaSalud("visitas", version));
app.use("/api/v1", soloDesdeGateway);
app.use("/api/v1/visitas", require("./routes/visitas.routes"));
app.use("/internal/v1", require("./routes/internas.routes"));

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
