// Controladores HTTP de adeudos y parámetros.
const { datosValidados } = require("@caseta/shared");
const servicio = require("../services/reglas.service");

const idSolicitud = (req) => req.headers["x-request-id"];

async function listarAdeudos(req, res) {
  res.json(await servicio.listarAdeudos(datosValidados(req, ["query"])));
}

async function obtenerAdeudo(req, res) {
  const { adeudoId } = datosValidados(req, ["params"]);
  res.json(await servicio.obtenerAdeudo(adeudoId));
}

async function crearAdeudo(req, res) {
  const adeudo = await servicio.crearAdeudo(datosValidados(req, ["body"]), idSolicitud(req));
  res.status(201).location(`/api/v1/adeudos/${adeudo.id}`).json(adeudo);
}

async function liquidarAdeudo(req, res) {
  const { adeudoId } = datosValidados(req, ["params"]);
  res.json(await servicio.liquidarAdeudo(adeudoId));
}

async function listarParametros(req, res) {
  res.json(await servicio.listarParametros());
}

async function actualizarParametro(req, res) {
  const { clave } = datosValidados(req, ["params"]);
  const { valor } = datosValidados(req, ["body"]);
  res.json(await servicio.actualizarParametro(clave, valor, req.usuario.id));
}

// I05
async function parametroInterno(req, res) {
  const { clave } = datosValidados(req, ["params"]);
  res.json(await servicio.parametroInterno(clave));
}

// I04
async function evaluarLimite(req, res) {
  res.json(await servicio.evaluarLimite(datosValidados(req, ["body"])));
}

module.exports = {
  listarAdeudos, obtenerAdeudo, crearAdeudo, liquidarAdeudo, listarParametros, actualizarParametro,
  parametroInterno, evaluarLimite,
};
