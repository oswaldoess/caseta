// Clientes de las rutas internas que usa Visitas:
//   I03 (Viviendas)  vivienda y domicilio de un residente
//   I09 (Viviendas)  datos de una vivienda
//   I04 (Reglas)     regla RN03 del límite de personas por adeudo
// Si un servicio no responde en 3 segundos, llamarServicio lanza 503 y no se guarda nada.
const { llamarServicio, ErrorApi } = require("@caseta/shared");

const urlViviendas = () => process.env.URL_VIVIENDAS || "http://localhost:3002";
const urlReglas = () => process.env.URL_REGLAS || "http://localhost:3005";

const inesperado = (servicio) =>
  new ErrorApi(503, "SERVICIO_NO_DISPONIBLE", `No fue posible consultar el servicio de ${servicio}.`);

// I03: { viviendaId, domicilio, activa } o null si el residente no tiene vivienda.
async function viviendaDeResidente(usuarioId, idSolicitud) {
  const { estado, cuerpo } = await llamarServicio("Viviendas",
    `${urlViviendas()}/internal/v1/residentes/${usuarioId}/vivienda`, { idSolicitud });
  if (estado === 200) return cuerpo;
  if (estado === 404) return null;
  throw inesperado("Viviendas");
}

// I09: { id, domicilio, activa } o null si la vivienda no existe.
async function obtenerVivienda(viviendaId, idSolicitud) {
  const { estado, cuerpo } = await llamarServicio("Viviendas",
    `${urlViviendas()}/internal/v1/viviendas/${viviendaId}`, { idSolicitud });
  if (estado === 200) return cuerpo;
  if (estado === 404) return null;
  throw inesperado("Viviendas");
}

// I04: { permitido, tieneAdeudoPendiente, limite, disponibles, motivo }
async function evaluarLimite(datos, idSolicitud) {
  const { estado, cuerpo } = await llamarServicio("Reglas y Adeudos",
    `${urlReglas()}/internal/v1/evaluaciones-limite`, { metodo: "POST", cuerpo: datos, idSolicitud });
  if (estado === 200) return cuerpo;
  throw new ErrorApi(503, "SERVICIO_NO_DISPONIBLE",
    "No fue posible validar las reglas del fraccionamiento. Inténtalo en unos momentos.");
}

module.exports = { viviendaDeResidente, obtenerVivienda, evaluarLimite };
