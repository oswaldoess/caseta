// Formato estándar de errores de Caseta (documento de la Entrega 3, Tablas 11 y 12).
class ErrorApi extends Error {
  constructor(estado, codigo, mensaje, detalles = []) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

const fechaLocal = () => {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  return d.toISOString().replace("Z", "-06:00").replace(/\.\d{3}/, "");
};

function cuerpoError(req, estado, codigo, mensaje, detalles = []) {
  return {
    error: {
      codigo, mensaje, estado, detalles,
      ruta: req.originalUrl,
      fecha: fechaLocal(),
      idSolicitud: req.headers["x-request-id"] || null,
    },
  };
}

// Responde 404 con el formato estándar cuando ninguna ruta coincide.
function rutaNoEncontrada(req, res) {
  res.status(404).json(cuerpoError(req, 404, "RECURSO_NO_ENCONTRADO", "La ruta solicitada no existe."));
}

// Manejador final de errores: nunca expone detalles internos al consumidor.
// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  if (err instanceof ErrorApi) {
    return res.status(err.estado).json(cuerpoError(req, err.estado, err.codigo, err.message, err.detalles));
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json(cuerpoError(req, 400, "VALIDACION_FALLIDA", "El cuerpo de la petición no es un JSON válido."));
  }
  console.error(`[${req.headers["x-request-id"] || "sin-id"}]`, err);
  return res.status(500).json(cuerpoError(req, 500, "ERROR_INTERNO", "Ocurrió un error inesperado. Inténtalo más tarde."));
}

module.exports = { ErrorApi, cuerpoError, rutaNoEncontrada, manejadorErrores };
