const express = require("express");
const { rutaNoEncontrada, manejadorErrores } = require("@caseta/shared");
const healthRoutes = require("./routes/health.routes");

// S4. Accesos: validación de códigos, entradas, salidas e historial.
const app = express();
app.use(express.json());

app.use(healthRoutes);
// Aquí se montarán las rutas del servicio, por ejemplo:
// app.use("/api/v1/...", require("./routes/...routes"));

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
