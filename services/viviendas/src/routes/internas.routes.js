// Rutas internas de S2 (Entrega 3, Tabla 11). No pasan por el gateway y exigen X-Clave-Servicio.
const { Router } = require("express");
const { requiereClaveServicio } = require("@caseta/shared");
const v = require("../validators/viviendas.validator");
const c = require("../controllers/viviendas.controller");

const router = Router();
router.use(requiereClaveServicio);

// I03: Visitas obtiene la vivienda y el domicilio de un residente.
router.get("/residentes/:usuarioId/vivienda", v.usuarioEnRuta, c.viviendaDeResidente);
// I09 (nueva en la Entrega 6): Visitas y Reglas comprueban que una vivienda existe y está activa.
router.get("/viviendas/:viviendaId", v.obtener, c.resumenInterno);

module.exports = router;
