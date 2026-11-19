// Rutas públicas de accesos (E22 a E26). Se publican en el gateway bajo /api/v1/accesos.
const { Router } = require("express");
const { permitir } = require("@caseta/shared");
const v = require("../validators/accesos.validator");
const c = require("../controllers/accesos.controller");

const router = Router();
const guardia = permitir("guardia");
const consulta = permitir("administrador", "residente", "guardia");

router.get("/", consulta, v.historial, c.historial);                                  // E23 Historial (cada rol ve lo suyo)
router.post("/", guardia, v.registrarEntrada, c.registrarEntrada);                    // E22 Registrar entrada
router.get("/:accesoId", consulta, v.obtener, c.obtener);                             // E24 Consultar un acceso
router.patch("/:accesoId", permitir("guardia", "administrador"), v.agregarObservacion, c.agregarObservacion); // E26
router.post("/:accesoId/salida", guardia, v.registrarSalida, c.registrarSalida);      // E25 Registrar salida

module.exports = router;
