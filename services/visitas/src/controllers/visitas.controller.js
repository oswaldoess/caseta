// Controladores HTTP de visitas.
const { datosValidados } = require("@caseta/shared");
const servicio = require("../services/visitas.service");

const idSolicitud = (req) => req.headers["x-request-id"];

async function listar(req, res) {
  res.json(await servicio.listar(datosValidados(req, ["query"]), req.usuario, idSolicitud(req)));
}

async function obtener(req, res) {
  const { visitaId } = datosValidados(req, ["params"]);
  res.json(await servicio.obtener(visitaId, req.usuario, idSolicitud(req)));
}

async function crear(req, res) {
  const visita = await servicio.crear(datosValidados(req, ["body"]), req.usuario, idSolicitud(req));
  res.status(201).location(`/api/v1/visitas/${visita.id}`).json(visita);
}

async function actualizar(req, res) {
  const { visitaId } = datosValidados(req, ["params"]);
  res.json(await servicio.actualizar(visitaId, datosValidados(req, ["body"]), req.usuario, idSolicitud(req)));
}

async function cancelar(req, res) {
  const { visitaId } = datosValidados(req, ["params"]);
  await servicio.cancelar(visitaId, req.usuario, idSolicitud(req));
  res.status(204).end();
}

// I06
async function porCodigo(req, res) {
  const { codigo } = datosValidados(req, ["query"]);
  res.json(await servicio.porCodigo(codigo));
}

// I07
async function registrarUso(req, res) {
  const { visitaId } = datosValidados(req, ["params"]);
  const { accesoId } = datosValidados(req, ["body"]);
  res.status(201).json(await servicio.registrarUso(visitaId, accesoId));
}

// I08
async function crearNoProgramada(req, res) {
  res.status(201).json(await servicio.crearNoProgramada(datosValidados(req, ["body"]), idSolicitud(req)));
}

// I10
async function anular(req, res) {
  const { visitaId } = datosValidados(req, ["params"]);
  res.json(await servicio.anularNoProgramada(visitaId));
}

module.exports = { listar, obtener, crear, actualizar, cancelar, porCodigo, registrarUso, crearNoProgramada, anular };
