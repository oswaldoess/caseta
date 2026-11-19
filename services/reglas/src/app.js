const express = require("express");
const { rutaNoEncontrada, manejadorErrores, crearRutaSalud, soloDesdeGateway } = require("@caseta/shared");
const { version } = require("../package.json");

// S5. Reglas y Adeudos: adeudos y parámetros del reglamento.
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use(crearRutaSalud("reglas", version));
app.use("/api/v1", soloDesdeGateway);
app.use("/api/v1/adeudos", require("./routes/adeudos.routes"));
app.use("/api/v1/parametros", require("./routes/parametros.routes"));
app.use("/internal/v1", require("./routes/internas.routes"));

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
