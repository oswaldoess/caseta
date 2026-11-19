// Controladores HTTP de accesos.
const { datosValidados } = require("@caseta/shared");
const servicio = require("../services/accesos.service");

const idSolicitud = (req) => req.headers["x-request-id"];

async function validez(req, res) {
  const { codigo } = datosValidados(req, ["params"]);
  res.json(await servicio.validez(codigo, idSolicitud(req)));
}

async function registrarEntrada(req, res) {
  const acceso = await servicio.registrarEntrada(datosValidados(req, ["body"]), req.usuario, idSolicitud(req));
  res.status(201).location(`/api/v1/accesos/${acceso.id}`).json(acceso);
}

async function historial(req, res) {
  res.json(await servicio.historial(datosValidados(req, ["query"]), req.usuario, idSolicitud(req)));
}

async function obtener(req, res) {
  const { accesoId } = datosValidados(req, ["params"]);
  res.json(await servicio.obtener(accesoId, req.usuario, idSolicitud(req)));
}

async function registrarSalida(req, res) {
  const { accesoId } = datosValidados(req, ["params"]);
  const { observaciones } = datosValidados(req, ["body"]);
  res.status(201).json(await servicio.registrarSalida(accesoId, req.usuario, observaciones));
}

async function agregarObservacion(req, res) {
  const { accesoId } = datosValidados(req, ["params"]);
  const { observaciones } = datosValidados(req, ["body"]);
  res.json(await servicio.agregarObservacion(accesoId, req.usuario, observaciones, idSolicitud(req)));
}

module.exports = { validez, registrarEntrada, historial, obtener, registrarSalida, agregarObservacion };
