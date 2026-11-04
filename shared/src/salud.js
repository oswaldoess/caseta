// Ruta /health de cada servicio (RNF07). No requiere autenticación.
// A partir de la Entrega 5 también informa si la base de datos responde.
const { Router } = require("express");
const { verificarBaseDatos } = require("./db");
const { fechaLocal } = require("./errores");

function crearRutaSalud(servicio, version) {
  const router = Router();
  router.get("/health", async (req, res) => {
    const baseDatos = await verificarBaseDatos();
    const ok = baseDatos === "ok";
    res.status(ok ? 200 : 503).json({
      servicio,
      estado: ok ? "ok" : "degradado",
      baseDatos,
      version,
      fecha: fechaLocal(),
    });
  });
  return router;
}

module.exports = { crearRutaSalud };
