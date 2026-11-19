// Cliente de la ruta interna I09 de S2. Viviendas.
// Reglas no lee la tabla viviendas: pide los datos al servicio dueño.
const { llamarServicio, ErrorApi } = require("@caseta/shared");

const urlBase = () => process.env.URL_VIVIENDAS || "http://localhost:3002";

// Devuelve { id, domicilio, activa } o null si la vivienda no existe.
async function obtenerVivienda(viviendaId, idSolicitud) {
  const { estado, cuerpo } = await llamarServicio("Viviendas", `${urlBase()}/internal/v1/viviendas/${viviendaId}`, { idSolicitud });
  if (estado === 200) return cuerpo;
  if (estado === 404) return null;
  throw new ErrorApi(503, "SERVICIO_NO_DISPONIBLE", "No fue posible consultar el servicio de Viviendas.");
}

module.exports = { obtenerVivienda };
