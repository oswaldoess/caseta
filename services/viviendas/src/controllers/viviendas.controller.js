// Controladores HTTP de viviendas y residentes.
const { datosValidados } = require("@caseta/shared");
const servicio = require("../services/viviendas.service");

const idSolicitud = (req) => req.headers["x-request-id"];

async function listar(req, res) {
  res.json(await servicio.listar(datosValidados(req, ["query"])));
}

async function obtener(req, res) {
  const { viviendaId } = datosValidados(req, ["params"]);
  res.json(await servicio.obtenerComo(viviendaId, req.usuario));
}

// I03
async function viviendaDeResidente(req, res) {
  const { usuarioId } = datosValidados(req, ["params"]);
  res.json(await servicio.viviendaDeResidente(usuarioId));
}

// I09
async function resumenInterno(req, res) {
  const { viviendaId } = datosValidados(req, ["params"]);
  res.json(await servicio.resumenInterno(viviendaId));
}

async function crear(req, res) {
  const vivienda = await servicio.crear(datosValidados(req, ["body"]));
  res.status(201).location(`/api/v1/viviendas/${vivienda.id}`).json(vivienda);
}

async function actualizar(req, res) {
  const { viviendaId } = datosValidados(req, ["params"]);
  res.json(await servicio.actualizar(viviendaId, datosValidados(req, ["body"])));
}

async function listarResidentes(req, res) {
  const { viviendaId } = datosValidados(req, ["params"]);
  res.json(await servicio.listarResidentes(viviendaId, idSolicitud(req)));
}

async function asignarResidente(req, res) {
  const { viviendaId } = datosValidados(req, ["params"]);
  const asignacion = await servicio.asignarResidente(viviendaId, datosValidados(req, ["body"]), idSolicitud(req));
  res.status(201)
    .location(`/api/v1/viviendas/${viviendaId}/residentes/${asignacion.usuarioId}`)
    .json(asignacion);
}

async function retirarResidente(req, res) {
  const { viviendaId, usuarioId } = datosValidados(req, ["params"]);
  await servicio.retirarResidente(viviendaId, usuarioId);
  res.status(204).end();
}

module.exports = {
  listar, obtener, crear, actualizar, listarResidentes, asignarResidente, retirarResidente,
  viviendaDeResidente, resumenInterno,
};
