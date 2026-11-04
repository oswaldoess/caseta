// Comunicación entre servicios por las rutas internas /internal/v1 (Entrega 3, Tabla 11).
const crypto = require("crypto");
const { ErrorApi } = require("./errores");

const TIEMPO_LIMITE_MS = 3000;

// Middleware para las rutas internas: exigen el encabezado X-Clave-Servicio.
function requiereClaveServicio(req, res, next) {
  const esperada = Buffer.from(process.env.CLAVE_SERVICIO || "");
  const recibida = Buffer.from(req.headers["x-clave-servicio"] || "");
  const valida = esperada.length > 0 && esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
  if (!valida) {
    return next(new ErrorApi(401, "TOKEN_INVALIDO", "Falta la clave de servicio o no es válida."));
  }
  next();
}

// Llama a la ruta interna de otro servicio. Si no responde en 3 segundos responde 503.
// Devuelve { estado, cuerpo } para que el servicio que llama decida qué hacer con 404, 409, etc.
async function llamarServicio(nombreServicio, url, { metodo = "GET", cuerpo, idSolicitud } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        "X-Clave-Servicio": process.env.CLAVE_SERVICIO || "",
        ...(idSolicitud ? { "X-Request-Id": idSolicitud } : {}),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
    });
  } catch (err) {
    console.error(`[${idSolicitud || "sin-id"}] ${nombreServicio} no respondió: ${err.message}`);
    throw new ErrorApi(503, "SERVICIO_NO_DISPONIBLE",
      `El servicio de ${nombreServicio} no está disponible en este momento. Inténtalo en unos momentos.`);
  }
  let datos = null;
  if (respuesta.status !== 204) {
    try { datos = await respuesta.json(); } catch { datos = null; }
  }
  if (respuesta.status >= 500) {
    throw new ErrorApi(503, "SERVICIO_NO_DISPONIBLE",
      `El servicio de ${nombreServicio} no pudo responder. Inténtalo en unos momentos.`);
  }
  return { estado: respuesta.status, cuerpo: datos };
}

module.exports = { requiereClaveServicio, llamarServicio };
