// Rutas de parámetros del reglamento (E31, E32). Se publican bajo /api/v1/parametros. Solo administración.
const { Router } = require("express");
const { permitir } = require("@caseta/shared");
const v = require("../validators/reglas.validator");
const c = require("../controllers/reglas.controller");

const router = Router();
router.use(permitir("administrador"));

router.get("/", c.listarParametros);                              // E31 Listar parámetros
router.put("/:clave", v.actualizarParametro, c.actualizarParametro); // E32 Modificar parámetro

module.exports = router;
