// Rutas de sesiones (E01, E02). Se publican en el gateway bajo /api/v1/sesiones.
const { Router } = require("express");
const { permitir } = require("@caseta/shared");
const v = require("../validators/sesiones.validator");
const c = require("../controllers/sesiones.controller");

const router = Router();

router.post("/", v.iniciar, c.iniciar);              // E01 Iniciar sesión (pública)
router.delete("/actual", permitir(), c.cerrar);      // E02 Cerrar sesión (todos los roles)

module.exports = router;
