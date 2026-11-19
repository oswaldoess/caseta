// Reglas de validación de los contratos de visitas (Entrega 3, E16 a E20, I06 a I08, I10).
const { body, query } = require("express-validator");
const {
  validar, soloCampos, idEnRuta, reglasPaginacion, fechaEnConsulta, esFecha, esHora, esEnteroJson,
} = require("@caseta/shared");

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const CAMPOS_UNICA = ["tipo", "nombreVisitante", "placas", "numeroPersonas", "fecha", "horaInicio", "horaFin"];
const CAMPOS_FRECUENTE = ["tipo", "nombreVisitante", "placas", "numeroPersonas", "fechaInicio", "fechaFin", "horaInicio", "horaFin", "diasSemana"];
const CAMPOS_ACTUALIZAR = ["nombreVisitante", "placas", "numeroPersonas", "fecha", "fechaFin", "horaInicio", "horaFin", "diasSemana"];

const conMensaje = (prueba, mensaje) => (v) => { if (!prueba(v)) throw new Error(mensaje); return true; };
// "si" (opcional) limita la regla a un tipo de visita; .if() debe ir al inicio de la cadena.
const segun = (campo, si) => (si ? body(campo).if(body("tipo").equals(si)) : body(campo));
const fecha = (campo, si) => segun(campo, si).custom(conMensaje(esFecha, "Debe ser una fecha con formato AAAA-MM-DD."));
const hora = (campo) => body(campo).custom(conMensaje(esHora, "Debe ser una hora con formato HH:mm (00:00 a 23:59)."));

const nombreVisitante = () => body("nombreVisitante")
  .isString().withMessage("Debe ser texto.").bail()
  .trim().isLength({ min: 3, max: 120 }).withMessage("Debe tener entre 3 y 120 caracteres.");

// Placas opcionales; null las borra. Se guardan en mayúsculas.
const placas = () => body("placas")
  .optional({ values: "undefined" })
  .custom((v) => {
    if (v === null) return true;
    if (typeof v !== "string" || !/^[A-Za-z0-9-]{1,12}$/.test(v.trim())) {
      throw new Error("Deben tener de 1 a 12 letras, números o guiones.");
    }
    return true;
  })
  .customSanitizer((v) => (typeof v === "string" ? v.trim().toUpperCase() : v));

const numeroPersonas = () => body("numeroPersonas").custom(esEnteroJson(1, 20));

const diasSemana = (si) => segun("diasSemana", si).custom((v) => {
  if (!Array.isArray(v) || v.length === 0) throw new Error("Debe ser una lista con al menos un día.");
  if (!v.every((d) => DIAS.includes(d))) throw new Error(`Cada día debe ser uno de: ${DIAS.join(", ")}.`);
  if (new Set(v).size !== v.length) throw new Error("No repitas días.");
  return true;
});

// RN09 cuando vienen las dos horas en el cuerpo (si viene una sola, el servicio la compara con la guardada).
const horaFinPosterior = () => body("horaFin").custom((v, { req }) => {
  const inicio = req.body.horaInicio;
  if (esHora(v) && esHora(inicio) && v <= inicio) throw new Error("Debe ser posterior a horaInicio.");
  return true;
});

// Los campos permitidos dependen del tipo de visita.
const camposSegunTipo = (req, res, next) => {
  const tipo = req.body && req.body.tipo;
  return soloCampos(tipo === "frecuente" ? CAMPOS_FRECUENTE : CAMPOS_UNICA)(req, res, next);
};

const listar = [
  query("estado").optional().isIn(["activa", "cancelada", "utilizada", "vencida"]).withMessage("Debe ser activa, cancelada, utilizada o vencida."),
  query("tipo").optional().isIn(["unica", "frecuente", "no_programada"]).withMessage("Debe ser unica, frecuente o no_programada."),
  fechaEnConsulta("validaEn"),
  fechaEnConsulta("desde"),
  fechaEnConsulta("hasta"),
  query("q").optional().isString().trim().isLength({ max: 100 }).withMessage("Máximo 100 caracteres."),
  query("viviendaId").optional().isInt({ min: 1 }).withMessage("Debe ser un número entero desde 1.").toInt(),
  ...reglasPaginacion,
  validar,
];

const obtener = [idEnRuta("visitaId"), validar];

const crear = [
  camposSegunTipo,
  body("tipo").isIn(["unica", "frecuente"]).withMessage("Debe ser unica o frecuente."),
  nombreVisitante(),
  placas(),
  numeroPersonas(),
  fecha("fecha", "unica"),
  fecha("fechaInicio", "frecuente"),
  fecha("fechaFin", "frecuente"),
  diasSemana("frecuente"),
  hora("horaInicio"),
  hora("horaFin"),
  horaFinPosterior(),
  validar,
];

const actualizar = [
  idEnRuta("visitaId"),
  soloCampos(CAMPOS_ACTUALIZAR, { alMenosUno: true }),
  nombreVisitante().optional(),
  placas(),
  numeroPersonas().optional(),
  fecha("fecha").optional(),
  fecha("fechaFin").optional(),
  diasSemana().optional(),
  hora("horaInicio").optional(),
  hora("horaFin").optional(),
  horaFinPosterior(),
  validar,
];

// ----- Rutas internas -----

const porCodigo = [
  query("codigo").matches(/^[A-HJ-NP-Z2-9]{8}$/).withMessage("Debe tener 8 caracteres válidos."),
  validar,
];

const registrarUso = [
  idEnRuta("visitaId"),
  body("accesoId").custom(esEnteroJson(1)),
  validar,
];

const crearNoProgramada = [
  soloCampos(["viviendaId", "nombreVisitante", "placas", "numeroPersonas", "autorizadoPor"]),
  body("viviendaId").custom(esEnteroJson(1)),
  nombreVisitante(),
  placas(),
  numeroPersonas(),
  body("autorizadoPor").isString().withMessage("Debe ser texto.").bail()
    .trim().isLength({ min: 3, max: 120 }).withMessage("Debe tener entre 3 y 120 caracteres."),
  validar,
];

const anular = [idEnRuta("visitaId"), validar];

module.exports = {
  listar, obtener, crear, actualizar, porCodigo, registrarUso, crearNoProgramada, anular,
};
