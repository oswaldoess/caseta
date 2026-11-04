// Rutas públicas de viviendas (E09 a E15). Se publican en el gateway bajo /api/v1/viviendas.
// La verificación del token y de los roles se agrega en la Entrega 6.
const { Router } = require("express");
const v = require("../validators/viviendas.validator");
const c = require("../controllers/viviendas.controller");

const router = Router();

router.get("/", v.listar, c.listar);                       // E09 Listar viviendas
router.post("/", v.crear, c.crear);                        // E10 Registrar vivienda
router.get("/:viviendaId", v.obtener, c.obtener);          // E11 Consultar vivienda
router.patch("/:viviendaId", v.actualizar, c.actualizar);  // E12 Actualizar o desactivar vivienda

router.get("/:viviendaId/residentes", v.obtener, c.listarResidentes);                         // E13
router.post("/:viviendaId/residentes", v.asignarResidente, c.asignarResidente);               // E14
router.delete("/:viviendaId/residentes/:usuarioId", v.retirarResidente, c.retirarResidente);  // E15

module.exports = router;
