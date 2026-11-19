// Rutas de adeudos (E27 a E30). Se publican en el gateway bajo /api/v1/adeudos. Solo administración.
const { Router } = require("express");
const { permitir } = require("@caseta/shared");
const v = require("../validators/reglas.validator");
const c = require("../controllers/reglas.controller");

const router = Router();
router.use(permitir("administrador"));

router.get("/", v.listarAdeudos, c.listarAdeudos);                  // E27 Listar adeudos
router.post("/", v.crearAdeudo, c.crearAdeudo);                     // E28 Registrar adeudo
router.get("/:adeudoId", v.obtenerAdeudo, c.obtenerAdeudo);         // E29 Consultar adeudo
router.patch("/:adeudoId", v.liquidarAdeudo, c.liquidarAdeudo);     // E30 Liquidar adeudo

module.exports = router;
