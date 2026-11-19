// Lógica de negocio de adeudos y parámetros del reglamento (S5. Reglas y Adeudos, RF15, RF16).
const { ErrorApi, aIso, fechaLegible, leerPaginacion, respuestaLista } = require("@caseta/shared");
const repo = require("../repositories/reglas.repository");
const viviendas = require("../clients/viviendas.client");

function aAdeudo(f) {
  return {
    id: f.id,
    viviendaId: f.vivienda_id,
    concepto: f.concepto,
    periodo: f.periodo,
    monto: Number(f.monto),
    estado: f.estado,
    registradoEn: aIso(f.registrado_en),
    liquidadoEn: aIso(f.liquidado_en),
  };
}

function aParametro(f) {
  return {
    clave: f.clave,
    valor: f.valor,
    descripcion: f.descripcion,
    minimo: f.minimo,
    maximo: f.maximo,
    actualizadoEn: aIso(f.actualizado_en),
  };
}

const adeudoNoEncontrado = (id) => new ErrorApi(404, "RECURSO_NO_ENCONTRADO", `El adeudo ${id} no existe.`);

async function listarAdeudos(filtros) {
  const paginacion = leerPaginacion(filtros);
  const { filas, total } = await repo.listarAdeudos(filtros, paginacion);
  return respuestaLista(filas.map(aAdeudo), total, paginacion);
}

async function obtenerAdeudo(id) {
  const fila = await repo.buscarAdeudo(id);
  if (!fila) throw adeudoNoEncontrado(id);
  return aAdeudo(fila);
}

// E28: la vivienda debe existir y estar activa (se pregunta a Viviendas por I09).
async function crearAdeudo(datos, idSolicitud) {
  const vivienda = await viviendas.obtenerVivienda(datos.viviendaId, idSolicitud);
  if (!vivienda || !vivienda.activa) {
    throw new ErrorApi(422, "REFERENCIA_INVALIDA",
      vivienda ? `La vivienda ${datos.viviendaId} está desactivada.` : `La vivienda ${datos.viviendaId} no existe.`,
      [{ campo: "viviendaId", mensaje: "Debe ser una vivienda activa." }]);
  }
  const id = await repo.crearAdeudo(datos);
  return obtenerAdeudo(id);
}

// E30: solo se pasa de pendiente a liquidado; liquidar dos veces es un conflicto.
async function liquidarAdeudo(id) {
  const actual = await repo.buscarAdeudo(id);
  if (!actual) throw adeudoNoEncontrado(id);
  const cambiadas = await repo.liquidarAdeudo(id);
  if (!cambiadas) {
    const ya = await repo.buscarAdeudo(id);
    throw new ErrorApi(409, "ADEUDO_YA_LIQUIDADO",
      `El adeudo ${id} ya fue liquidado el ${fechaLegible(ya.liquidado_en)}.`);
  }
  return obtenerAdeudo(id);
}

async function listarParametros() {
  return { datos: (await repo.listarParametros()).map(aParametro) };
}

async function exigirParametro(clave) {
  const fila = await repo.buscarParametro(clave);
  if (!fila) throw new ErrorApi(404, "RECURSO_NO_ENCONTRADO", `El parámetro ${clave} no existe.`);
  return fila;
}

// E32: el valor debe quedar dentro del rango del parámetro.
async function actualizarParametro(clave, valor, usuarioId) {
  const p = await exigirParametro(clave);
  if (valor < p.minimo || valor > p.maximo) {
    throw new ErrorApi(400, "VALIDACION_FALLIDA", "Algunos campos no son válidos.", [
      { campo: "valor", mensaje: `Debe estar entre ${p.minimo} y ${p.maximo}.` },
    ]);
  }
  await repo.actualizarParametro(clave, valor, usuarioId);
  return aParametro(await exigirParametro(clave));
}

// I05
async function parametroInterno(clave) {
  const p = await exigirParametro(clave);
  return { clave: p.clave, valor: p.valor };
}

// I04: regla RN03. Si la vivienda tiene un adeudo pendiente, solo puede recibir
// "limite_personas_con_adeudo" personas por día. Visitas manda cuántas personas ya tiene
// registradas ese día y cuántas pide; Reglas decide con sus propios datos.
async function evaluarLimite({ viviendaId, fecha, personasSolicitadas, personasYaRegistradas }) {
  const tieneAdeudoPendiente = await repo.tieneAdeudoPendiente(viviendaId);
  const { valor: limite } = await parametroInterno("limite_personas_con_adeudo");
  if (!tieneAdeudoPendiente) {
    return { permitido: true, tieneAdeudoPendiente, limite, disponibles: null, motivo: null };
  }
  const disponibles = Math.max(0, limite - personasYaRegistradas);
  const permitido = personasSolicitadas <= disponibles;
  return {
    permitido,
    tieneAdeudoPendiente,
    limite,
    disponibles,
    motivo: permitido ? null
      : `La vivienda tiene un adeudo pendiente y solo puede recibir ${limite} personas por día. `
        + `Para el ${fechaLegible(fecha)} ya hay ${personasYaRegistradas} registradas.`,
  };
}

module.exports = {
  listarAdeudos, obtenerAdeudo, crearAdeudo, liquidarAdeudo,
  listarParametros, actualizarParametro, parametroInterno, evaluarLimite,
};
