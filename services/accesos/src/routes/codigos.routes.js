// Ruta de validación de códigos (E21). Se publica en el gateway bajo /api/v1/codigos. Solo guardia.
const { Router } = require("express");
const { permitir } = require("@caseta/shared");
const v = require("../validators/accesos.validator");
const c = require("../controllers/accesos.controller");

const router = Router();

router.get("/:codigo/validez", permitir("guardia"), v.validez, c.validez); // E21 Consultar validez de un código

module.exports = router;
