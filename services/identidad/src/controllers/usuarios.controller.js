// Controladores HTTP de usuarios: leen la petición ya validada y responden.
const { datosValidados } = require("@caseta/shared");
const servicio = require("../services/usuarios.service");

async function listar(req, res) {
  res.json(await servicio.listar(datosValidados(req, ["query"])));
}

async function obtener(req, res) {
  const { usuarioId } = datosValidados(req, ["params"]);
  res.json(await servicio.obtener(usuarioId));
}

async function crear(req, res) {
  const usuario = await servicio.crear(datosValidados(req, ["body"]));
  res.status(201).location(`/api/v1/usuarios/${usuario.id}`).json(usuario);
}

async function actualizar(req, res) {
  const { usuarioId } = datosValidados(req, ["params"]);
  res.json(await servicio.actualizar(usuarioId, datosValidados(req, ["body"]), req.usuario));
}

async function resumenInterno(req, res) {
  const { usuarioId } = datosValidados(req, ["params"]);
  res.json(await servicio.resumenInterno(usuarioId));
}

module.exports = { listar, obtener, crear, actualizar, resumenInterno };
