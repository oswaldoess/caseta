// Rutas internas de S3 (Entrega 3, Tabla 11). No pasan por el gateway y exigen X-Clave-Servicio.
const { Router } = require("express");
const { requiereClaveServicio } = require("@caseta/shared");
const v = require("../validators/visitas.validator");
const c = require("../controllers/visitas.controller");

const router = Router();
router.use(requiereClaveServicio);

router.get("/visitas", v.porCodigo, c.porCodigo);                               // I06 Visita de un código
router.post("/visitas", v.crearNoProgramada, c.crearNoProgramada);              // I08 Crear visita no programada
router.post("/visitas/:visitaId/usos", v.registrarUso, c.registrarUso);         // I07 Registrar el uso de un código
router.post("/visitas/:visitaId/anulacion", v.anular, c.anular);                // I10 Compensación (nueva)

module.exports = router;
