// Rutas internas de S1 (Entrega 3, Tabla 11). No pasan por el gateway y exigen X-Clave-Servicio.
const { Router } = require("express");
const { requiereClaveServicio } = require("@caseta/shared");
const v = require("../validators/usuarios.validator");
const vs = require("../validators/sesiones.validator");
const c = require("../controllers/usuarios.controller");
const cs = require("../controllers/sesiones.controller");

const router = Router();
router.use(requiereClaveServicio);

// I01: el gateway pregunta si un token fue revocado (o si la cuenta se desactivó).
router.get("/tokens-revocados/:jti", vs.estadoToken, cs.estadoToken);
// I02: Viviendas comprueba que el usuario existe, está activo y es residente.
router.get("/usuarios/:usuarioId", v.obtener, c.resumenInterno);

module.exports = router;
