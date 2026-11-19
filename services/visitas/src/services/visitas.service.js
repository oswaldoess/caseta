// Lógica de negocio de visitas (S3. Visitas, RF06 a RF09, RN03, RN06, RN09).
const crypto = require("crypto");
const {
  ErrorApi, aIso, aFecha, aHora, ahoraLocal, diaSemana, sumarDias, sumarMeses, fechaLegible,
  conTransaccion, restriccionDuplicada, leerPaginacion, respuestaLista, sinPermiso,
} = require("@caseta/shared");
const repo = require("../repositories/visitas.repository");
const servicios = require("../clients/servicios.client");

const DIAS_ANTICIPACION = 30; // una visita única se registra de hoy a 30 días
const MESES_FRECUENTE = 6;    // una visita frecuente dura como máximo seis meses
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin I, O, 0 ni 1 para que no se confundan al dictarlo

function aVisita(f) {
  return {
    id: f.id,
    tipo: f.tipo,
    estado: f.estado,
    codigo: f.codigo,
    viviendaId: f.vivienda_id,
    domicilio: f.domicilio,
    residenteId: f.residente_id,
    nombreVisitante: f.nombre_visitante,
    placas: f.placas,
    numeroPersonas: f.numero_personas,
    fechaInicio: aFecha(f.fecha_inicio),
    fechaFin: aFecha(f.fecha_fin),
    horaInicio: aHora(f.hora_inicio),
    horaFin: aHora(f.hora_fin),
    diasSemana: f.dias ? f.dias.split(",") : [],
    autorizadoPor: f.autorizado_por,
    tieneEntradas: Boolean(f.tiene_entradas),
    creadaEn: aIso(f.creada_en),
    actualizadaEn: aIso(f.actualizada_en),
  };
}

const noEncontrada = (id) => new ErrorApi(404, "RECURSO_NO_ENCONTRADO", `La visita ${id} no existe.`);
const invalido = (campo, mensaje) =>
  new ErrorApi(400, "VALIDACION_FALLIDA", "Algunos campos no son válidos.", [{ campo, mensaje }]);

function generarCodigo() {
  let c = "";
  for (let i = 0; i < 8; i++) c += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return c;
}

// Vivienda del residente con sesión (I03). La vivienda nunca se toma del cuerpo de la petición.
async function viviendaDelResidente(usuario, idSolicitud) {
  const vivienda = await servicios.viviendaDeResidente(usuario.id, idSolicitud);
  if (!vivienda) {
    throw new ErrorApi(422, "REFERENCIA_INVALIDA", "No tienes una vivienda asignada. Comunícate con la administración.");
  }
  if (!vivienda.activa) {
    throw new ErrorApi(422, "REFERENCIA_INVALIDA", `La vivienda ${vivienda.domicilio} está desactivada.`);
  }
  return vivienda;
}

// Visita que el usuario puede ver: el residente solo las de su vivienda (si no, 404 para no revelar nada).
async function visitaVisible(id, usuario, idSolicitud) {
  const fila = await repo.buscarPorId(id);
  if (!fila) throw noEncontrada(id);
  if (usuario.rol === "residente") {
    const vivienda = await servicios.viviendaDeResidente(usuario.id, idSolicitud);
    if (!vivienda || vivienda.viviendaId !== fila.vivienda_id) throw noEncontrada(id);
  }
  return fila;
}

// ----- Reglas de fechas y horarios -----

function validarVigencia(v, hoy) {
  if (v.tipo === "unica") {
    const max = sumarDias(hoy.fecha, DIAS_ANTICIPACION);
    if (v.fechaInicio < hoy.fecha || v.fechaInicio > max) {
      throw invalido("fecha", `Debe estar entre hoy (${fechaLegible(hoy.fecha)}) y el ${fechaLegible(max)}.`);
    }
  } else {
    if (v.fechaFin < v.fechaInicio) throw invalido("fechaFin", "No puede ser anterior a fechaInicio.");
    if (v.fechaFin < hoy.fecha) throw invalido("fechaFin", "No puede ser una fecha pasada.");
    const max = sumarMeses(v.fechaInicio, MESES_FRECUENTE);
    if (v.fechaFin > max) throw invalido("fechaFin", `Una visita frecuente dura como máximo seis meses (hasta el ${fechaLegible(max)}).`);
  }
  // RN09: la hora de fin es posterior a la de inicio.
  if (v.horaFin <= v.horaInicio) throw invalido("horaFin", "Debe ser posterior a horaInicio.");
  // Una visita de hoy no puede terminar en una hora que ya pasó.
  if (v.tipo === "unica" && v.fechaInicio === hoy.fecha && v.horaFin <= hoy.hora) {
    throw invalido("horaFin", `Ya pasó: son las ${hoy.hora}.`);
  }
}

// RN03: límite de personas por día para viviendas con adeudo pendiente. La decisión la toma Reglas (I04).
async function aplicarLimitePorAdeudo({ viviendaId, fecha, personas, excluirVisitaId }, idSolicitud) {
  const personasYaRegistradas = await repo.personasRegistradas(viviendaId, fecha, excluirVisitaId);
  const r = await servicios.evaluarLimite(
    { viviendaId, fecha, personasSolicitadas: personas, personasYaRegistradas }, idSolicitud);
  if (!r.permitido) {
    throw new ErrorApi(422, "LIMITE_PERSONAS_EXCEDIDO", r.motivo, [{
      campo: "numeroPersonas",
      mensaje: r.disponibles > 0
        ? `Puedes registrar hasta ${r.disponibles} persona${r.disponibles === 1 ? "" : "s"} para esa fecha.`
        : "Ya no puedes registrar más personas para esa fecha.",
    }]);
  }
}

// ----- Operaciones públicas -----

// E16: cada rol ve un conjunto distinto, y el filtro lo pone el servidor, no el cliente.
async function listar(filtros, usuario, idSolicitud) {
  const f = { ...filtros };
  if (usuario.rol !== "administrador" && f.viviendaId !== undefined) {
    throw sinPermiso("Solo la administración puede filtrar por vivienda.");
  }
  if (usuario.rol === "residente") {
    const vivienda = await servicios.viviendaDeResidente(usuario.id, idSolicitud);
    if (!vivienda) return respuestaLista([], 0, leerPaginacion(f));
    f.viviendaId = vivienda.viviendaId;
  }
  if (usuario.rol === "guardia") {
    const hoy = ahoraLocal().fecha;
    if (f.validaEn !== undefined && f.validaEn !== hoy) {
      throw sinPermiso("El guardia solo puede consultar las visitas válidas hoy.");
    }
    f.validaEn = hoy;
  }
  if (f.validaEn !== undefined) f.diaValidaEn = diaSemana(f.validaEn);
  if (f.desde && f.hasta && f.desde > f.hasta) throw invalido("hasta", "No puede ser anterior a desde.");

  const paginacion = leerPaginacion(f);
  const { filas, total } = await repo.listar(f, paginacion);
  return respuestaLista(filas.map(aVisita), total, paginacion);
}

async function obtener(id, usuario, idSolicitud) {
  return aVisita(await visitaVisible(id, usuario, idSolicitud));
}

// E17: registrar una visita única o frecuente para la vivienda del residente y generar su código.
async function crear(datos, usuario, idSolicitud) {
  const hoy = ahoraLocal();
  const vivienda = await viviendaDelResidente(usuario, idSolicitud);

  const v = {
    tipo: datos.tipo,
    nombreVisitante: datos.nombreVisitante,
    placas: datos.placas ?? null,
    numeroPersonas: datos.numeroPersonas,
    fechaInicio: datos.tipo === "unica" ? datos.fecha : datos.fechaInicio,
    fechaFin: datos.tipo === "unica" ? datos.fecha : datos.fechaFin,
    horaInicio: datos.horaInicio,
    horaFin: datos.horaFin,
    diasSemana: datos.tipo === "frecuente" ? datos.diasSemana : [],
    viviendaId: vivienda.viviendaId,
    domicilio: vivienda.domicilio,
    residenteId: usuario.id,
  };
  if (v.tipo === "frecuente" && (v.fechaInicio < hoy.fecha || v.fechaInicio > sumarDias(hoy.fecha, DIAS_ANTICIPACION))) {
    throw invalido("fechaInicio", `Debe estar entre hoy (${fechaLegible(hoy.fecha)}) y el ${fechaLegible(sumarDias(hoy.fecha, DIAS_ANTICIPACION))}.`);
  }
  validarVigencia(v, hoy);
  // La regla del adeudo aplica a las visitas de un solo día (reuniones); las frecuentes son servicio regular.
  if (v.tipo === "unica") {
    await aplicarLimitePorAdeudo({ viviendaId: v.viviendaId, fecha: v.fechaInicio, personas: v.numeroPersonas }, idSolicitud);
  }

  // El código lo genera el servidor (RF08). Si por azar ya existe, se intenta con otro.
  for (let intento = 0; intento < 5; intento++) {
    try {
      const id = await conTransaccion((tx) => repo.crear(tx, { ...v, codigo: generarCodigo() }));
      return aVisita(await repo.buscarPorId(id));
    } catch (err) {
      if (restriccionDuplicada(err) !== "uq_visitas_codigo") throw err;
    }
  }
  throw new Error("No se pudo generar un código único después de 5 intentos.");
}

// RN06: solo se modifica o cancela una visita activa y sin entradas.
function exigirModificable(fila, accion) {
  if (fila.tiene_entradas) {
    throw new ErrorApi(409, "VISITA_CON_ENTRADA",
      `La visita ${fila.id} ya tiene una entrada registrada y no se puede ${accion}.`);
  }
  if (fila.estado !== "activa") {
    throw new ErrorApi(409, "CONFLICTO", `La visita ${fila.id} está ${fila.estado} y ya no se puede ${accion}.`);
  }
}

// E19
async function actualizar(id, cambios, usuario, idSolicitud) {
  const fila = await visitaVisible(id, usuario, idSolicitud);
  exigirModificable(fila, "modificar");

  // Campos que solo aplican a un tipo de visita (el tipo no se puede cambiar).
  if (fila.tipo === "unica" && (cambios.fechaFin !== undefined || cambios.diasSemana !== undefined)) {
    throw invalido(cambios.fechaFin !== undefined ? "fechaFin" : "diasSemana", "Solo aplica a visitas frecuentes; en una visita única usa fecha.");
  }
  if (fila.tipo === "frecuente" && cambios.fecha !== undefined) {
    throw invalido("fecha", "Solo aplica a visitas únicas; en una visita frecuente usa fechaFin.");
  }

  const actual = aVisita(fila);
  const nueva = {
    tipo: fila.tipo,
    fechaInicio: cambios.fecha ?? actual.fechaInicio,
    fechaFin: fila.tipo === "unica" ? (cambios.fecha ?? actual.fechaFin) : (cambios.fechaFin ?? actual.fechaFin),
    horaInicio: cambios.horaInicio ?? actual.horaInicio,
    horaFin: cambios.horaFin ?? actual.horaFin,
  };
  validarVigencia(nueva, ahoraLocal());

  // Si cambian las personas o el día de una visita única, se vuelve a aplicar RN03 (sin contarse a sí misma).
  if (fila.tipo === "unica" && (cambios.numeroPersonas !== undefined || cambios.fecha !== undefined)) {
    await aplicarLimitePorAdeudo({
      viviendaId: fila.vivienda_id,
      fecha: nueva.fechaInicio,
      personas: cambios.numeroPersonas ?? actual.numeroPersonas,
      excluirVisitaId: id,
    }, idSolicitud);
  }

  const columnas = { ...cambios };
  if (cambios.fecha !== undefined) { columnas.fechaInicio = cambios.fecha; columnas.fechaFin = cambios.fecha; }
  delete columnas.fecha;
  await conTransaccion((tx) => repo.actualizar(tx, id, columnas));
  return aVisita(await repo.buscarPorId(id));
}

// E20: la visita no se borra; queda cancelada y su código deja de servir de inmediato.
async function cancelar(id, usuario, idSolicitud) {
  const fila = await visitaVisible(id, usuario, idSolicitud);
  exigirModificable(fila, "cancelar");
  if (!(await repo.cancelar(id))) {
    // Otra petición la usó o la canceló entre la lectura y la escritura.
    exigirModificable(await repo.buscarPorId(id), "cancelar");
  }
}

// ----- Rutas internas -----

// I06
async function porCodigo(codigo) {
  const fila = await repo.buscarPorCodigo(codigo);
  if (!fila) throw new ErrorApi(404, "CODIGO_NO_ENCONTRADO", `No existe ninguna visita con el código ${codigo}.`);
  return aVisita(fila);
}

// I07: registra el uso de una visita para un acceso. Una visita única o no programada se usa una sola vez.
// Todo ocurre en una transacción con la fila de la visita bloqueada.
async function registrarUso(visitaId, accesoId) {
  return conTransaccion(async (tx) => {
    const v = await repo.bloquearVisita(tx, visitaId);
    if (!v) throw noEncontrada(visitaId);
    if (v.estado === "utilizada") {
      throw new ErrorApi(409, "CODIGO_YA_UTILIZADO", `La visita ${visitaId} acaba de ser utilizada en otra entrada.`);
    }
    if (v.estado !== "activa" || aFecha(v.fecha_fin) < ahoraLocal().fecha) {
      throw new ErrorApi(409, "CONFLICTO", `La visita ${visitaId} ya no está activa.`);
    }
    try {
      await repo.registrarUso(tx, visitaId, accesoId);
    } catch (err) {
      if (restriccionDuplicada(err) === "uq_visita_usos_acceso") {
        throw new ErrorApi(409, "CONFLICTO", `El acceso ${accesoId} ya tiene un uso registrado.`);
      }
      throw err;
    }
    if (v.tipo !== "frecuente") await repo.marcarUtilizada(tx, visitaId);
    return { visitaId, accesoId, estado: v.tipo === "frecuente" ? "activa" : "utilizada" };
  });
}

// I08: visita no programada que registra el guardia (RF14). Se valida la vivienda (I09) y RN03 para hoy.
async function crearNoProgramada(datos, idSolicitud) {
  const hoy = ahoraLocal().fecha;
  const vivienda = await servicios.obtenerVivienda(datos.viviendaId, idSolicitud);
  if (!vivienda || !vivienda.activa) {
    throw new ErrorApi(422, "REFERENCIA_INVALIDA",
      vivienda ? `La vivienda ${datos.viviendaId} está desactivada.` : `La vivienda ${datos.viviendaId} no existe.`,
      [{ campo: "visitaNoProgramada.viviendaId", mensaje: "Debe ser una vivienda activa." }]);
  }
  await aplicarLimitePorAdeudo({ viviendaId: vivienda.id, fecha: hoy, personas: datos.numeroPersonas }, idSolicitud);
  const id = await conTransaccion((tx) => repo.crear(tx, {
    tipo: "no_programada",
    viviendaId: vivienda.id,
    domicilio: vivienda.domicilio,
    nombreVisitante: datos.nombreVisitante,
    placas: datos.placas ?? null,
    numeroPersonas: datos.numeroPersonas,
    fechaInicio: hoy,
    fechaFin: hoy,
    autorizadoPor: datos.autorizadoPor,
  }));
  return aVisita(await repo.buscarPorId(id));
}

// I10: compensación. Si Accesos no pudo terminar la entrada de una visita no programada,
// la anula para que no quede una visita "a medias" (patrón saga).
async function anularNoProgramada(visitaId) {
  return conTransaccion(async (tx) => {
    const v = await repo.bloquearVisita(tx, visitaId);
    if (!v) throw noEncontrada(visitaId);
    if (v.tipo !== "no_programada" || (await repo.contarUsos(tx, visitaId)) > 0) {
      throw new ErrorApi(409, "CONFLICTO", `La visita ${visitaId} no se puede anular.`);
    }
    await repo.marcarCancelada(tx, visitaId);
    return { visitaId, estado: "cancelada" };
  });
}

module.exports = {
  listar, obtener, crear, actualizar, cancelar,
  porCodigo, registrarUso, crearNoProgramada, anularNoProgramada,
};
