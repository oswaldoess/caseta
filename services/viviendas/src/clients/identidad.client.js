// Cliente de la ruta interna I02 de S1. Identidad.
// Viviendas no lee la tabla usuarios: pide los datos al servicio dueño.
const { llamarServicio, ErrorApi } = require("@caseta/shared");

const urlBase = () => process.env.URL_IDENTIDAD || "http://localhost:3001";

// Devuelve { id, nombreCompleto, rol, activo } o null si el usuario no existe.
async function obtenerUsuario(usuarioId, idSolicitud) {
  const { estado, cuerpo } = await llamarServicio("Identidad", `${urlBase()}/internal/v1/usuarios/${usuarioId}`, { idSolicitud });
  if (estado === 200) return cuerpo;
  if (estado === 404) return null;
  // 401 aquí significa que las claves de servicio no coinciden: es un error de configuración.
  throw new ErrorApi(503, "SERVICIO_NO_DISPONIBLE", "No fue posible consultar el servicio de Identidad.");
}

module.exports = { obtenerUsuario };
