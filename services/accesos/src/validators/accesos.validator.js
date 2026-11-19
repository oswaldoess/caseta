// Reglas de validación de los contratos de accesos (Entrega 3, E21 a E26).
const { body, param, query } = require("express-validator");
const {
  validar, soloCampos, idEnRuta, reglasPaginacion, fechaEnConsulta, booleanoEnConsulta, esEnteroJson, ErrorApi,
} = require("@caseta/shared");

const CODIGO = /^[A-HJ-NP-Z2-9]{8}$/;
const mensajeCodigo = "Debe tener 8 caracteres: letras sin I ni O y números del 2 al 9.";

const observaciones = (opcional = true) => {
  const regla = body("observaciones")
    .isString().withMessage("Debe ser texto.").bail()
    .trim().isLength({ min: 1, max: 250 }).withMessage("Debe tener entre 1 y 250 caracteres.");
  return opcional ? regla.optional() : regla;
};

// El guardia puede escribir el código en minúsculas; se normaliza antes de validarlo.
const validez = [
  param("codigo").customSanitizer((v) => String(v).toUpperCase()).matches(CODIGO).withMessage(mensajeCodigo),
  validar,
];

// E22: se envía un código o una visita no programada, pero no ambos.
const unaDeDos = (req, res, next) => {
  const b = req.body || {};
  const tieneCodigo = b.codigo !== undefined;
  const tieneVisita = b.visitaNoProgramada !== undefined;
  if (tieneCodigo === tieneVisita) {
    return next(new ErrorApi(400, "VALIDACION_FALLIDA", "Algunos campos no son válidos.", [{
      campo: tieneCodigo ? "visitaNoProgramada" : "codigo",
      mensaje: "Envía un código o los datos de una visita no programada, pero no ambos.",
    }]));
  }
  next();
};

const registrarEntrada = [
  soloCampos(["codigo", "visitaNoProgramada", "observaciones"]),
  unaDeDos,
  body("codigo").optional().isString().withMessage("Debe ser texto.").bail()
    .customSanitizer((v) => v.trim().toUpperCase()).matches(CODIGO).withMessage(mensajeCodigo),
  body("visitaNoProgramada").optional().isObject().withMessage("Debe ser un objeto."),
  body("visitaNoProgramada.viviendaId").if(body("visitaNoProgramada").exists()).custom(esEnteroJson(1)),
  body("visitaNoProgramada.nombreVisitante").if(body("visitaNoProgramada").exists())
    .isString().withMessage("Debe ser texto.").bail()
    .trim().isLength({ min: 3, max: 120 }).withMessage("Debe tener entre 3 y 120 caracteres."),
  body("visitaNoProgramada.placas").if(body("visitaNoProgramada").exists()).optional({ values: "null" })
    .isString().withMessage("Debe ser texto.").bail()
    .trim().toUpperCase().matches(/^[A-Z0-9-]{1,12}$/).withMessage("Deben tener de 1 a 12 letras, números o guiones."),
  body("visitaNoProgramada.numeroPersonas").if(body("visitaNoProgramada").exists()).custom(esEnteroJson(1, 20)),
  body("visitaNoProgramada.autorizadoPor").if(body("visitaNoProgramada").exists())
    .isString().withMessage("Debe ser texto.").bail()
    .trim().isLength({ min: 3, max: 120 }).withMessage("Debe tener entre 3 y 120 caracteres."),
  observaciones(),
  validar,
];

const historial = [
  fechaEnConsulta("desde"),
  fechaEnConsulta("hasta"),
  query("viviendaId").optional().isInt({ min: 1 }).withMessage("Debe ser un número entero desde 1.").toInt(),
  query("residenteId").optional().isInt({ min: 1 }).withMessage("Debe ser un número entero desde 1.").toInt(),
  query("tipoVisita").optional().isIn(["unica", "frecuente", "no_programada"]).withMessage("Debe ser unica, frecuente o no_programada."),
  booleanoEnConsulta("dentro"),
  ...reglasPaginacion,
  validar,
];

const obtener = [idEnRuta("accesoId"), validar];

// E25: el cuerpo es opcional.
const registrarSalida = [
  idEnRuta("accesoId"),
  (req, res, next) => { if (req.body === undefined) req.body = {}; next(); },
  soloCampos(["observaciones"]),
  observaciones(),
  validar,
];

const agregarObservacion = [
  idEnRuta("accesoId"),
  soloCampos(["observaciones"]),
  observaciones(false),
  validar,
];

module.exports = { validez, registrarEntrada, historial, obtener, registrarSalida, agregarObservacion };
