// Lógica de negocio de usuarios (S1. Identidad, RF04).
const bcrypt = require("bcryptjs");
const { ErrorApi, aIso, traducirDuplicado, leerPaginacion, respuestaLista } = require("@caseta/shared");
const repo = require("../repositories/usuarios.repository");

const COSTO_BCRYPT = Number(process.env.BCRYPT_COSTO) || 10; // RNF01: costo de al menos 10

// Fila de MySQL -> objeto de la API (camelCase; nunca incluye la contraseña).
function aUsuario(f) {
  return {
    id: f.id,
    nombreCompleto: f.nombre_completo,
    correo: f.correo,
    telefono: f.telefono,
    rol: f.rol,
    activo: Boolean(f.activo),
    creadoEn: aIso(f.creado_en),
    actualizadoEn: aIso(f.actualizado_en),
  };
}

const noEncontrado = (id) => new ErrorApi(404, "RECURSO_NO_ENCONTRADO", `El usuario ${id} no existe.`);

async function listar(filtros) {
  const paginacion = leerPaginacion(filtros);
  const { filas, total } = await repo.listar(filtros, paginacion);
  return respuestaLista(filas.map(aUsuario), total, paginacion);
}

async function obtener(id) {
  const fila = await repo.buscarPorId(id);
  if (!fila) throw noEncontrado(id);
  return aUsuario(fila);
}

async function crear(datos) {
  const contrasenaHash = await bcrypt.hash(datos.contrasenaInicial, COSTO_BCRYPT);
  try {
    const id = await repo.crear({ ...datos, contrasenaHash });
    return obtener(id);
  } catch (err) {
    throw traducirDuplicado(err, {
      uq_usuarios_correo: () => new ErrorApi(409, "CORREO_DUPLICADO",
        `Ya existe una cuenta registrada con el correo ${datos.correo}.`),
    });
  }
}

async function actualizar(id, cambios, quien) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw noEncontrado(id);
  // Un administrador no puede dejar el sistema sin su propio acceso por error.
  if (quien && quien.id === id && (cambios.activo === false || (cambios.rol && cambios.rol !== "administrador"))) {
    throw new ErrorApi(409, "CONFLICTO", "No puedes desactivar tu propia cuenta ni quitarte el rol de administrador.");
  }
  await repo.actualizar(id, cambios);
  return obtener(id);
}

// Datos mínimos para otros servicios (I02): existe, está activo y qué rol tiene.
async function resumenInterno(id) {
  const fila = await repo.buscarPorId(id);
  if (!fila) throw noEncontrado(id);
  return { id: fila.id, nombreCompleto: fila.nombre_completo, rol: fila.rol, activo: Boolean(fila.activo) };
}

module.exports = { listar, obtener, crear, actualizar, resumenInterno };
