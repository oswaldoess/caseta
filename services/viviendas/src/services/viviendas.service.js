// Lógica de negocio de viviendas y residentes (S2. Viviendas, RF05 y RF06).
const { ErrorApi, aIso, aFecha, traducirDuplicado, leerPaginacion, respuestaLista } = require("@caseta/shared");
const repo = require("../repositories/viviendas.repository");
const identidad = require("../clients/identidad.client");

function aVivienda(f) {
  return {
    id: f.id,
    calle: f.calle,
    numero: f.numero,
    referencia: f.referencia,
    domicilio: `${f.calle} ${f.numero}`, // 1FN: calle y número se guardan separados y se unen al consultar
    activa: Boolean(f.activa),
    totalResidentes: Number(f.total_residentes),
    creadaEn: aIso(f.creada_en),
    actualizadaEn: aIso(f.actualizada_en),
  };
}

const viviendaNoEncontrada = (id) => new ErrorApi(404, "RECURSO_NO_ENCONTRADO", `La vivienda ${id} no existe.`);

const duplicada = (calle, numero) => ({
  uq_viviendas_domicilio: () => new ErrorApi(409, "VIVIENDA_DUPLICADA", `Ya existe la vivienda ${calle} ${numero}.`),
});

async function exigirVivienda(id) {
  const fila = await repo.buscarPorId(id);
  if (!fila) throw viviendaNoEncontrada(id);
  return fila;
}

async function listar(filtros) {
  const paginacion = leerPaginacion(filtros);
  const { filas, total } = await repo.listar(filtros, paginacion);
  return respuestaLista(filas.map(aVivienda), total, paginacion);
}

async function obtener(id) {
  return aVivienda(await exigirVivienda(id));
}

async function crear(datos) {
  try {
    const id = await repo.crear(datos);
    return obtener(id);
  } catch (err) {
    throw traducirDuplicado(err, duplicada(datos.calle, datos.numero));
  }
}

async function actualizar(id, cambios) {
  const actual = await exigirVivienda(id);
  try {
    await repo.actualizar(id, cambios);
  } catch (err) {
    throw traducirDuplicado(err, duplicada(cambios.calle ?? actual.calle, cambios.numero ?? actual.numero));
  }
  return obtener(id);
}

// ----- Residentes de una vivienda (E13 a E15) -----

function aAsignacion(fila, usuario) {
  return {
    usuarioId: fila.usuario_id,
    nombreCompleto: usuario ? usuario.nombreCompleto : null,
    esTitular: Boolean(fila.es_titular),
    fechaAlta: aFecha(fila.fecha_alta),
  };
}

async function listarResidentes(viviendaId, idSolicitud) {
  await exigirVivienda(viviendaId);
  const filas = await repo.listarResidentes(viviendaId);
  // El nombre no se copia en S2 (3FN): se pide a Identidad por la ruta interna I02.
  const usuarios = await Promise.all(filas.map((f) => identidad.obtenerUsuario(f.usuario_id, idSolicitud)));
  return { datos: filas.map((f, i) => aAsignacion(f, usuarios[i])) };
}

const referenciaInvalida = (mensaje) => new ErrorApi(422, "REFERENCIA_INVALIDA", mensaje, [
  { campo: "usuarioId", mensaje: "Debe ser un usuario activo con rol residente." },
]);

async function asignarResidente(viviendaId, { usuarioId, esTitular = false }, idSolicitud) {
  await exigirVivienda(viviendaId);

  // RN02: solo un usuario activo con rol residente puede vivir en una vivienda (I02).
  const usuario = await identidad.obtenerUsuario(usuarioId, idSolicitud);
  if (!usuario) throw referenciaInvalida(`El usuario ${usuarioId} no existe.`);
  if (!usuario.activo) throw referenciaInvalida(`El usuario ${usuarioId} está desactivado.`);
  if (usuario.rol !== "residente") throw referenciaInvalida(`El usuario ${usuarioId} no tiene rol de residente.`);

  const yaAsignado = (asignacion) => new ErrorApi(409, "RESIDENTE_YA_ASIGNADO",
    asignacion
      ? `El usuario ${usuarioId} ya está asignado a la vivienda ${asignacion.domicilio}.`
      : `El usuario ${usuarioId} ya está asignado a otra vivienda.`);

  const existente = await repo.asignacionDeUsuario(usuarioId);
  if (existente) throw yaAsignado(existente);

  try {
    await repo.asignarResidente(viviendaId, usuarioId, esTitular);
  } catch (err) {
    // La base es la última barrera si dos peticiones llegan al mismo tiempo.
    throw traducirDuplicado(err, {
      uq_residentes_usuario: () => yaAsignado(null),
      uq_residentes_titular: () => new ErrorApi(409, "TITULAR_YA_ASIGNADO",
        `La vivienda ${viviendaId} ya tiene un titular. Asigna al residente con esTitular en false.`),
    });
  }
  return aAsignacion(await repo.buscarAsignacion(viviendaId, usuarioId), usuario);
}

async function retirarResidente(viviendaId, usuarioId) {
  await exigirVivienda(viviendaId);
  const borradas = await repo.retirarResidente(viviendaId, usuarioId);
  if (!borradas) {
    throw new ErrorApi(404, "RECURSO_NO_ENCONTRADO",
      `El usuario ${usuarioId} no está asignado a la vivienda ${viviendaId}.`);
  }
}

module.exports = { listar, obtener, crear, actualizar, listarResidentes, asignarResidente, retirarResidente };
