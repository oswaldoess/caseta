// Rutas públicas de visitas (E16 a E20). Se publican en el gateway bajo /api/v1/visitas.
const { Router } = require("express");
const { permitir } = require("@caseta/shared");
const v = require("../validators/visitas.validator");
const c = require("../controllers/visitas.controller");

const router = Router();
const residente = permitir("residente");

router.get("/", permitir("residente", "guardia", "administrador"), v.listar, c.listar); // E16 (guardia: solo hoy)
router.post("/", residente, v.crear, c.crear);                                         // E17 Registrar visita
router.get("/:visitaId", permitir("residente", "administrador"), v.obtener, c.obtener); // E18 (residente: solo las suyas)
router.patch("/:visitaId", residente, v.actualizar, c.actualizar);                     // E19 Modificar visita
router.delete("/:visitaId", residente, v.obtener, c.cancelar);                         // E20 Cancelar visita

module.exports = router;
