// Controladores HTTP de sesiones, perfil y contraseña.
const { datosValidados } = require("@caseta/shared");
const servicio = require("../services/sesiones.service");

// IP real del cliente: el gateway la agrega en X-Forwarded-For.
const ipCliente = (req) => String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();

async function iniciar(req, res) {
  const sesion = await servicio.iniciarSesion(datosValidados(req, ["body"]), ipCliente(req));
  res.status(201).json(sesion);
}

async function cerrar(req, res) {
  await servicio.cerrarSesion(req.usuario);
  res.status(204).end();
}

async function perfil(req, res) {
  res.json(await servicio.perfil(req.usuario.id));
}

async function cambiarContrasena(req, res) {
  await servicio.cambiarContrasena(req.usuario.id, datosValidados(req, ["body"]));
  res.status(204).end();
}

// I01: 200 si el token ya no sirve; 404 si sigue vigente.
async function estadoToken(req, res) {
  const { jti } = datosValidados(req, ["params"]);
  const { usuarioId } = datosValidados(req, ["query"]);
  const estado = await servicio.estadoToken(jti, usuarioId);
  if (!estado) return res.status(404).json({ jti, revocado: false });
  res.json(estado);
}

module.exports = { iniciar, cerrar, perfil, cambiarContrasena, estadoToken };
