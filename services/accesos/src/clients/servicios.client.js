// Clientes de las rutas internas que usa Accesos:
//   I06 (Visitas)    visita de un código
//   I07 (Visitas)    registrar el uso de un código
//   I08 (Visitas)    crear una visita no programada
//   I10 (Visitas)    anular una visita no programada (compensación)
//   I05 (Reglas)     tolerancia de horario
//   I03 (Viviendas)  vivienda de un residente (historial del residente)
const { llamarServicio, ErrorApi } = require("@caseta/shared");

const urlVisitas = () => process.env.URL_VISITAS || "http://localhost:3003";
const urlReglas = () => process.env.URL_REGLAS || "http://localhost:3005";
const urlViviendas = () => process.env.URL_VIVIENDAS || "http://localhost:3002";

const noDisponible = (servicio) =>
  new ErrorApi(503, "SERVICIO_NO_DISPONIBLE", `No fue posible consultar el servicio de ${servicio}. Inténtalo en unos momentos.`);

// Convierte el error estándar que respondió otro servicio en el mismo error para el cliente.
const reenviarError = (estado, cuerpo, servicio) => {
  const e = cuerpo && cuerpo.error;
  return e ? new ErrorApi(estado, e.codigo, e.mensaje, e.detalles || []) : noDisponible(servicio);
};

// I06: la visita o null si no existe ningún código así.
async function visitaPorCodigo(codigo, idSolicitud) {
  const { estado, cuerpo } = await llamarServicio("Visitas",
    `${urlVisitas()}/internal/v1/visitas?codigo=${encodeURIComponent(codigo)}`, { idSolicitud });
  if (estado === 200) return cuerpo;
  if (estado === 404) return null;
  throw noDisponible("Visitas");
}

// I07: lanza el 409 de Visitas tal cual (CODIGO_YA_UTILIZADO o CONFLICTO).
async function registrarUso(visitaId, accesoId, idSolicitud) {
  const { estado, cuerpo } = await llamarServicio("Visitas",
    `${urlVisitas()}/internal/v1/visitas/${visitaId}/usos`, { metodo: "POST", cuerpo: { accesoId }, idSolicitud });
  if (estado === 201) return cuerpo;
  if (estado === 409) throw reenviarError(estado, cuerpo, "Visitas");
  throw noDisponible("Visitas");
}

// I08: lanza el 422 de Visitas tal cual (REFERENCIA_INVALIDA o LIMITE_PERSONAS_EXCEDIDO).
async function crearNoProgramada(datos, idSolicitud) {
  const { estado, cuerpo } = await llamarServicio("Visitas",
    `${urlVisitas()}/internal/v1/visitas`, { metodo: "POST", cuerpo: datos, idSolicitud });
  if (estado === 201) return cuerpo;
  if (estado === 422 || estado === 400) throw reenviarError(estado, cuerpo, "Visitas");
  throw noDisponible("Visitas");
}

// I10: compensación. Si falla, solo se registra en la consola: la visita no tiene código y no se puede usar.
async function anularNoProgramada(visitaId, idSolicitud) {
  try {
    await llamarServicio("Visitas", `${urlVisitas()}/internal/v1/visitas/${visitaId}/anulacion`, { metodo: "POST", idSolicitud });
  } catch (err) {
    console.error(`[${idSolicitud}] No se pudo anular la visita no programada ${visitaId}: ${err.message}`);
  }
}

// I05: valor de un parámetro del reglamento.
async function parametro(clave, idSolicitud) {
  const { estado, cuerpo } = await llamarServicio("Reglas y Adeudos",
    `${urlReglas()}/internal/v1/parametros/${clave}`, { idSolicitud });
  if (estado === 200) return cuerpo.valor;
  throw noDisponible("Reglas y Adeudos");
}

// I03: { viviendaId, domicilio, activa } o null.
async function viviendaDeResidente(usuarioId, idSolicitud) {
  const { estado, cuerpo } = await llamarServicio("Viviendas",
    `${urlViviendas()}/internal/v1/residentes/${usuarioId}/vivienda`, { idSolicitud });
  if (estado === 200) return cuerpo;
  if (estado === 404) return null;
  throw noDisponible("Viviendas");
}

module.exports = { visitaPorCodigo, registrarUso, crearNoProgramada, anularNoProgramada, parametro, viviendaDeResidente };
