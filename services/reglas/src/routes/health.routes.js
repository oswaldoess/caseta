const { Router } = require("express");
const { version } = require("../../package.json");

const router = Router();

// Verificación de estado (RNF07). No requiere autenticación.
router.get("/health", (req, res) => {
  res.json({ servicio: "reglas", estado: "ok", version, fecha: new Date().toISOString() });
});

module.exports = router;
