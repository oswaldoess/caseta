// Validación de entradas con express-validator y respuesta 400 con el formato estándar.
const { validationResult, matchedData, param, query } = require("express-validator");
const { ErrorApi } = require("./errores");

// Junta todos los errores en un solo 400 VALIDACION_FALLIDA, uno por campo,
// para que el consumidor corrija todo de una vez (Entrega 3, caso 1).
function validar(req, res, next) {
  const resultado = validationResult(req);
  if (resultado.isEmpty()) return next();
  const vistos = new Set();
  const detalles = [];
  for (const e of resultado.array()) {
    const campo = e.path || e.param || "cuerpo";
    if (vistos.has(campo)) continue;
    vistos.add(campo);
    detalles.push({ campo, mensaje: e.msg });
  }
  next(new ErrorApi(400, "VALIDACION_FALLIDA", "Algunos campos no son válidos.", detalles));
}

// Rechaza campos que el contrato no define ("sobran campos" también es 400).
function soloCampos(permitidos, { alMenosUno = false } = {}) {
  return (req, res, next) => {
    const cuerpo = req.body;
    if (cuerpo === undefined || cuerpo === null || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
      return next(new ErrorApi(400, "VALIDACION_FALLIDA", "El cuerpo de la petición debe ser un objeto JSON.", []));
    }
    const detalles = Object.keys(cuerpo)
      .filter((c) => !permitidos.includes(c))
      .map((c) => ({ campo: c, mensaje: "Campo no permitido." }));
    if (detalles.length) {
      return next(new ErrorApi(400, "VALIDACION_FALLIDA", "Algunos campos no son válidos.", detalles));
    }
    if (alMenosUno && Object.keys(cuerpo).length === 0) {
      return next(new ErrorApi(400, "VALIDACION_FALLIDA", "Envía al menos un campo para modificar.", [
        { campo: "cuerpo", mensaje: `Campos permitidos: ${permitidos.join(", ")}.` },
      ]));
    }
    next();
  };
}

// Parámetro de ruta entero desde 1 (usuarioId, viviendaId, ...).
const idEnRuta = (nombre) =>
  param(nombre).isInt({ min: 1, allow_leading_zeroes: false }).withMessage("Debe ser un número entero desde 1.").toInt();

// Booleano en la consulta: solo "true" o "false".
const booleanoEnConsulta = (nombre) =>
  query(nombre).optional().isIn(["true", "false"]).withMessage("Debe ser true o false.").customSanitizer((v) => v === "true");

// Booleano en el cuerpo: debe ser JSON true/false, no el texto "true".
const esBooleanoJson = (v) => {
  if (typeof v !== "boolean") throw new Error("Debe ser true o false.");
  return true;
};

// Fecha "AAAA-MM-DD" en la consulta (desde, hasta, validaEn).
const FECHA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const esFecha = (v) => typeof v === "string" && FECHA.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"))
  && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
const fechaEnConsulta = (nombre) =>
  query(nombre).optional().custom((v) => {
    if (!esFecha(v)) throw new Error("Debe ser una fecha con formato AAAA-MM-DD.");
    return true;
  });

// Hora "HH:mm" de 00:00 a 23:59.
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const esHora = (v) => typeof v === "string" && HORA.test(v);

// Entero JSON (no el texto "5").
const esEnteroJson = (min, max) => (v) => {
  if (!Number.isInteger(v) || v < min || (max !== undefined && v > max)) {
    throw new Error(max === undefined ? `Debe ser un número entero desde ${min}.` : `Debe ser un número entero entre ${min} y ${max}.`);
  }
  return true;
};

// Paginación común a todas las listas (pagina desde 1; limite de 1 a 100, 20 por defecto).
const reglasPaginacion = [
  query("pagina").optional().isInt({ min: 1 }).withMessage("Debe ser un número entero desde 1.").toInt(),
  query("limite").optional().isInt({ min: 1, max: 100 }).withMessage("Debe ser un número entero entre 1 y 100.").toInt(),
];

function leerPaginacion(datos) {
  const pagina = datos.pagina || 1;
  const limite = datos.limite || 20;
  return { pagina, limite, desplazamiento: (pagina - 1) * limite };
}

function respuestaLista(datos, total, { pagina, limite }) {
  return { datos, paginacion: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) } };
}

// Escapa % y _ para búsquedas con LIKE.
const patronLike = (texto) => "%" + String(texto).replace(/[\\%_]/g, (c) => "\\" + c) + "%";

// Valores ya validados y limpiados (en Express 5 req.query es de solo lectura).
const datosValidados = (req, ubicaciones) => matchedData(req, { locations: ubicaciones, includeOptionals: false });

module.exports = {
  validar, soloCampos, idEnRuta, booleanoEnConsulta, esBooleanoJson,
  reglasPaginacion, leerPaginacion, respuestaLista, patronLike, datosValidados,
  esFecha, fechaEnConsulta, esHora, esEnteroJson,
};
