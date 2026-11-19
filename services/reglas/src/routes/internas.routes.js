// Rutas internas de S5 (Entrega 3, Tabla 11). No pasan por el gateway y exigen X-Clave-Servicio.
const { Router } = require("express");
const { requiereClaveServicio } = require("@caseta/shared");
const v = require("../validators/reglas.validator");
const c = require("../controllers/reglas.controller");

const router = Router();
router.use(requiereClaveServicio);

// I04: Visitas pregunta si una vivienda puede recibir más personas en una fecha (RN03).
router.post("/evaluaciones-limite", v.evaluarLimite, c.evaluarLimite);
// I05: Accesos obtiene la tolerancia de horario.
router.get("/parametros/:clave", v.parametroInterno, c.parametroInterno);

module.exports = router;
