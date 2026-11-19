// Rutas públicas de viviendas (E09 a E15). Se publican en el gateway bajo /api/v1/viviendas.
// Entrega 6: cada ruta indica qué roles pueden usarla (Entrega 3, columna "Roles").
const { Router } = require("express");
const { permitir } = require("@caseta/shared");
const v = require("../validators/viviendas.validator");
const c = require("../controllers/viviendas.controller");

const router = Router();
const admin = permitir("administrador");

router.get("/", admin, v.listar, c.listar);                                          // E09 Listar viviendas
router.post("/", admin, v.crear, c.crear);                                           // E10 Registrar vivienda
router.get("/:viviendaId", permitir("administrador", "residente"), v.obtener, c.obtener); // E11 (residente: solo la suya)
router.patch("/:viviendaId", admin, v.actualizar, c.actualizar);                     // E12 Actualizar o desactivar vivienda

router.get("/:viviendaId/residentes", admin, v.obtener, c.listarResidentes);                        // E13
router.post("/:viviendaId/residentes", admin, v.asignarResidente, c.asignarResidente);              // E14
router.delete("/:viviendaId/residentes/:usuarioId", admin, v.retirarResidente, c.retirarResidente); // E15

module.exports = router;
