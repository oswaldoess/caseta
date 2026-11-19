const express = require("express");
const { rutaNoEncontrada, manejadorErrores, crearRutaSalud, soloDesdeGateway } = require("@caseta/shared");
const { version } = require("../package.json");

// S4. Accesos: validación de códigos, entradas, salidas e historial.
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.use(crearRutaSalud("accesos", version));
app.use("/api/v1", soloDesdeGateway);
app.use("/api/v1/codigos", require("./routes/codigos.routes"));
app.use("/api/v1/accesos", require("./routes/accesos.routes"));

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
