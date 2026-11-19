// Lógica de negocio de accesos (S4. Control de accesos, RF10 a RF14, RF17, RN04, RN05, RN07, RN08).
const {
  ErrorApi, aIso, ahoraLocal, aMinutos, deMinutos, fechaLegible, conTransaccion, restriccionDuplicada,
  leerPaginacion, respuestaLista, sinPermiso, consultar,
} = require("@caseta/shared");
const repo = require("../repositories/accesos.repository");
const servicios = require("../clients/servicios.client");

function aAcceso(f) {
  return {
    id: f.id,
    visitaId: f.visita_id,
    tipoVisita: f.tipo_visita,
    nombreVisitante: f.nombre_visitante,
    numeroPersonas: f.numero_personas,
    viviendaId: f.vivienda_id,
    domicilio: f.domicilio,
    residenteId: f.residente_id,
    entrada: aIso(f.entrada),
    guardiaEntradaId: f.guardia_entrada_id,
    salida: aIso(f.salida),
    guardiaSalidaId: f.guardia_salida_id,
    observaciones: f.observaciones || null,
  };
}

const noEncontrado = (id) => new ErrorApi(404, "RECURSO_NO_ENCONTRADO", `El acceso ${id} no existe.`);

// ----- RN04 y RN05: ¿el código permite entrar en este momento? -----
// Se revisa en orden, de lo más definitivo a lo más pasajero, y se devuelve el primer motivo.
function evaluar(visita, toleranciaMinutos, dentro, ahora) {
  const ventana = () => {
    const ini = deMinutos(aMinutos(visita.horaInicio) - toleranciaMinutos);
    const fin = deMinutos(aMinutos(visita.horaFin) + toleranciaMinutos);
    return { ini, fin };
  };
  const no = (motivo, mensaje) => ({ valido: false, motivo, mensaje });

  if (visita.estado === "cancelada") return no("cancelado", "La visita fue cancelada por el residente.");
  if (visita.estado === "utilizada") return no("ya_utilizado", "El código ya se utilizó; las visitas únicas solo permiten una entrada.");
  if (visita.estado === "vencida" || visita.fechaFin < ahora.fecha) {
    return no("vencido", `El código venció el ${fechaLegible(visita.fechaFin)}.`);
  }
  if (visita.fechaInicio > ahora.fecha) {
    return no("aun_no_vigente", `El código es válido a partir del ${fechaLegible(visita.fechaInicio)}.`);
  }
  if (visita.tipo === "frecuente" && !visita.diasSemana.includes(ahora.diaSemana)) {
    return no("dia_no_permitido", `El código solo es válido los días: ${visita.diasSemana.join(", ")}.`);
  }
  const { ini, fin } = ventana();
  if (ahora.minutos < aMinutos(ini) || ahora.minutos > aMinutos(fin)) {
    return no("fuera_de_horario", visita.tipo === "unica"
      ? `El código es válido el ${fechaLegible(visita.fechaInicio)} de ${ini} a ${fin}, considerando la tolerancia.`
      : `El código es válido de ${ini} a ${fin}, considerando la tolerancia.`);
  }
  if (dentro) return no("ya_dentro", "La visita ya está dentro del fraccionamiento; primero registra su salida.");
  return { valido: true, motivo: null, mensaje: "Acceso permitido." };
}

async function revisarCodigo(codigo, idSolicitud) {
  const visita = await servicios.visitaPorCodigo(codigo, idSolicitud);
  if (!visita) return { visita: null };
  const [tolerancia, dentro] = await Promise.all([
    servicios.parametro("tolerancia_minutos", idSolicitud),
    repo.visitaDentro(visita.id),
  ]);
  return { visita, resultado: evaluar(visita, tolerancia, dentro, ahoraLocal()) };
}

// E21: solo consulta; no registra nada.
async function validez(codigo, idSolicitud) {
  const { visita, resultado } = await revisarCodigo(codigo, idSolicitud);
  if (!visita) throw new ErrorApi(404, "CODIGO_NO_ENCONTRADO", `No existe ninguna visita con el código ${codigo}.`);
  return {
    codigo,
    ...resultado,
    visita: {
      id: visita.id,
      tipo: visita.tipo,
      nombreVisitante: visita.nombreVisitante,
      numeroPersonas: visita.numeroPersonas,
      domicilio: visita.domicilio,
      horaInicio: visita.horaInicio,
      horaFin: visita.horaFin,
    },
    consultadoEn: aIso(ahoraLocal().fechaHora),
  };
}

// Escritura de la entrada. Es la operación que cruza dos servicios, así que se hace en una transacción:
//   1. Se inserta el acceso en S4 (todavía sin confirmar).
//   2. Se pide a S3 que registre el uso del código (I07).
//   3. Solo si S3 responde 201 se confirma. Si S3 responde 409 (otro guardia lo usó) o no responde,
//      se revierte y no queda ninguna entrada a medias.
async function escribirEntrada(visita, guardiaId, observaciones, idSolicitud) {
  try {
    return await conTransaccion(async (tx) => {
      const accesoId = await repo.crear(tx, {
        visitaId: visita.id,
        tipoVisita: visita.tipo,
        nombreVisitante: visita.nombreVisitante,
        numeroPersonas: visita.numeroPersonas,
        viviendaId: visita.viviendaId,
        domicilio: visita.domicilio,
        residenteId: visita.residenteId,
        guardiaId,
      });
      if (observaciones) await repo.agregarObservacion(tx, accesoId, guardiaId, observaciones);
      await servicios.registrarUso(visita.id, accesoId, idSolicitud);
      return accesoId;
    });
  } catch (err) {
    // Índice único visita_dentro: la base impide dos entradas abiertas de la misma visita (RN05).
    if (restriccionDuplicada(err) === "uq_accesos_visita_dentro") {
      throw new ErrorApi(409, "CODIGO_YA_UTILIZADO", "Otro guardia acaba de registrar la entrada de esta visita.");
    }
    throw err;
  }
}

// E22: entrada con código o de una visita no programada.
async function registrarEntrada(datos, usuario, idSolicitud) {
  if (datos.codigo) {
    const { visita, resultado } = await revisarCodigo(datos.codigo, idSolicitud);
    if (!visita) {
      throw new ErrorApi(422, "CODIGO_NO_VALIDO", `El código ${datos.codigo} no corresponde a ninguna visita.`,
        [{ campo: "codigo", mensaje: "motivo: inexistente" }]);
    }
    if (!resultado.valido) {
      throw new ErrorApi(422, "CODIGO_NO_VALIDO", `El código ${datos.codigo} no es válido: ${resultado.mensaje}`,
        [{ campo: "codigo", mensaje: `motivo: ${resultado.motivo}` }]);
    }
    const id = await escribirEntrada(visita, usuario.id, datos.observaciones, idSolicitud);
    return aAcceso(await repo.buscarPorId(id));
  }

  // Visita no programada: Visitas la crea (valida la vivienda y RN03). Si después algo falla,
  // se anula esa visita (compensación) para que no quede registrada sin entrada.
  const visita = await servicios.crearNoProgramada(datos.visitaNoProgramada, idSolicitud);
  try {
    const id = await escribirEntrada(visita, usuario.id, datos.observaciones, idSolicitud);
    return aAcceso(await repo.buscarPorId(id));
  } catch (err) {
    await servicios.anularNoProgramada(visita.id, idSolicitud);
    throw err;
  }
}

// Alcance de consulta según el rol (RF17): administración todo; residente su vivienda; guardia el día en curso.
async function alcance(filtros, usuario, idSolicitud) {
  const f = { ...filtros };
  if (usuario.rol !== "administrador" && (f.viviendaId !== undefined || f.residenteId !== undefined)) {
    throw sinPermiso("Solo la administración puede filtrar por vivienda o por residente.");
  }
  if (usuario.rol === "residente") {
    const vivienda = await servicios.viviendaDeResidente(usuario.id, idSolicitud);
    if (!vivienda) return null;
    f.viviendaId = vivienda.viviendaId;
  }
  if (usuario.rol === "guardia") {
    const hoy = ahoraLocal().fecha;
    if ((f.desde !== undefined && f.desde !== hoy) || (f.hasta !== undefined && f.hasta !== hoy)) {
      throw sinPermiso("El guardia solo puede consultar los accesos del día en curso.");
    }
    f.alcanceGuardia = true;
  }
  if (f.desde && f.hasta && f.desde > f.hasta) {
    throw new ErrorApi(400, "VALIDACION_FALLIDA", "Algunos campos no son válidos.", [{ campo: "hasta", mensaje: "No puede ser anterior a desde." }]);
  }
  return f;
}

// E23
async function historial(filtros, usuario, idSolicitud) {
  const paginacion = leerPaginacion(filtros);
  const f = await alcance(filtros, usuario, idSolicitud);
  if (!f) return respuestaLista([], 0, paginacion);
  const { filas, total } = await repo.listar(f, paginacion);
  return respuestaLista(filas.map(aAcceso), total, paginacion);
}

// Acceso que el usuario puede ver; si no le corresponde se responde 404, como si no existiera.
async function accesoVisible(id, usuario, idSolicitud) {
  const fila = await repo.buscarPorId(id);
  if (!fila) throw noEncontrado(id);
  if (usuario.rol === "residente") {
    const vivienda = await servicios.viviendaDeResidente(usuario.id, idSolicitud);
    if (!vivienda || vivienda.viviendaId !== fila.vivienda_id) throw noEncontrado(id);
  }
  if (usuario.rol === "guardia" && !(await repo.dentroDeAlcanceGuardia(id))) throw noEncontrado(id);
  return fila;
}

// E24
async function obtener(id, usuario, idSolicitud) {
  return aAcceso(await accesoVisible(id, usuario, idSolicitud));
}

// E25: RN07, una sola salida y nunca antes de la entrada (la hora la pone el servidor).
async function registrarSalida(id, usuario, observaciones) {
  const fila = await repo.buscarPorId(id);
  if (!fila) throw noEncontrado(id);
  const yaRegistrada = (f) => new ErrorApi(409, "SALIDA_YA_REGISTRADA",
    `La salida del acceso ${id} ya fue registrada a las ${f.salida.slice(11, 16)}.`);
  if (fila.salida) throw yaRegistrada(fila);
  await conTransaccion(async (tx) => {
    if (!(await repo.registrarSalida(tx, id, usuario.id))) throw yaRegistrada(await repo.buscarPorId(id, tx));
    if (observaciones) await repo.agregarObservacion(tx, id, usuario.id, observaciones);
  });
  return aAcceso(await repo.buscarPorId(id));
}

// E26: RN08, el registro no se modifica; solo se le agregan observaciones.
async function agregarObservacion(id, usuario, texto, idSolicitud) {
  await accesoVisible(id, usuario, idSolicitud);
  await repo.agregarObservacion({ consultar }, id, usuario.id, texto);
  return aAcceso(await repo.buscarPorId(id));
}

module.exports = { validez, registrarEntrada, historial, obtener, registrarSalida, agregarObservacion, evaluar };
