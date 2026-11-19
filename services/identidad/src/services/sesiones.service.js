// Lógica de sesiones (S1. Identidad): inicio y cierre de sesión, cambio de contraseña (RF01 a RF03).
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ErrorApi } = require("@caseta/shared");
const repo = require("../repositories/sesiones.repository");
const usuarios = require("./usuarios.service");

const DURACION_SEGUNDOS = 8 * 60 * 60; // el token vale 8 horas (Entrega 3)
const COSTO_BCRYPT = Number(process.env.BCRYPT_COSTO) || 10;

// Hash con el que se compara cuando el correo no existe, para que la respuesta tarde lo mismo
// y no revele qué correos están registrados.
const HASH_FALSO = bcrypt.hashSync("contrasena-que-nadie-tiene", COSTO_BCRYPT);

// ----- Límite de intentos: 5 intentos fallidos por minuto por correo e IP (429) -----
const VENTANA_MS = 60 * 1000;
const MAX_INTENTOS = 5;
const intentos = new Map(); // clave -> [marcas de tiempo de intentos fallidos]

function intentosRecientes(clave) {
  const ahora = Date.now();
  const lista = (intentos.get(clave) || []).filter((t) => ahora - t < VENTANA_MS);
  if (lista.length) intentos.set(clave, lista); else intentos.delete(clave);
  return lista;
}

// Limpieza cada minuto para que el mapa no crezca sin límite con correos distintos (defecto D04).
setInterval(() => { for (const clave of intentos.keys()) intentosRecientes(clave); }, VENTANA_MS).unref();

const credencialesInvalidas = () =>
  new ErrorApi(401, "CREDENCIALES_INVALIDAS", "El correo o la contraseña no son correctos.");

async function iniciarSesion({ correo, contrasena }, ip) {
  const clave = `${ip}|${correo}`;
  if (intentosRecientes(clave).length >= MAX_INTENTOS) {
    throw new ErrorApi(429, "DEMASIADOS_INTENTOS",
      "Demasiados intentos de inicio de sesión. Espera un minuto e inténtalo de nuevo.");
  }

  const usuario = await repo.buscarCredenciales({ correo });
  const coincide = await bcrypt.compare(contrasena, usuario ? usuario.contrasena_hash : HASH_FALSO);
  // Una cuenta desactivada responde igual que una contraseña incorrecta (no se revela cuál falló).
  if (!usuario || !coincide || !usuario.activo) {
    intentos.set(clave, [...intentosRecientes(clave), Date.now()]);
    throw credencialesInvalidas();
  }
  intentos.delete(clave);

  const token = jwt.sign({ rol: usuario.rol }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    subject: String(usuario.id),
    jwtid: crypto.randomUUID(),
    issuer: "caseta",
    expiresIn: DURACION_SEGUNDOS,
  });
  repo.borrarRevocadosVencidos().catch(() => {});
  return {
    token,
    tipo: "Bearer",
    expiraEn: DURACION_SEGUNDOS,
    usuario: { id: usuario.id, nombreCompleto: usuario.nombre_completo, rol: usuario.rol },
  };
}

// E02: el token deja de servir aunque todavía no expire.
async function cerrarSesion({ id, jti, expira }) {
  await repo.revocarToken({ jti, usuarioId: id, expira });
}

// E04: se exige la contraseña actual; la nueva no puede ser igual a la actual.
async function cambiarContrasena(id, { contrasenaActual, contrasenaNueva }) {
  const usuario = await repo.buscarCredenciales({ id });
  if (!usuario) throw new ErrorApi(404, "RECURSO_NO_ENCONTRADO", "Tu cuenta ya no existe.");
  if (!(await bcrypt.compare(contrasenaActual, usuario.contrasena_hash))) {
    throw new ErrorApi(400, "CONTRASENA_ACTUAL_INCORRECTA", "La contraseña actual no es correcta.", [
      { campo: "contrasenaActual", mensaje: "No coincide con tu contraseña actual." },
    ]);
  }
  if (contrasenaActual === contrasenaNueva) {
    throw new ErrorApi(400, "VALIDACION_FALLIDA", "Algunos campos no son válidos.", [
      { campo: "contrasenaNueva", mensaje: "Debe ser distinta de la contraseña actual." },
    ]);
  }
  await repo.cambiarContrasena(id, await bcrypt.hash(contrasenaNueva, COSTO_BCRYPT));
}

// I01: { revocado: true, motivo } si el token ya no sirve; null si sigue vigente.
async function estadoToken(jti, usuarioId) {
  const { revocado, activo } = await repo.estadoToken(jti, usuarioId);
  if (revocado) return { jti, revocado: true, motivo: "sesion_cerrada" };
  if (!activo) return { jti, revocado: true, motivo: "cuenta_desactivada" };
  return null;
}

const perfil = (id) => usuarios.obtener(id);

module.exports = { iniciarSesion, cerrarSesion, cambiarContrasena, estadoToken, perfil };
