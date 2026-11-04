// Reglas de validación de los contratos de viviendas (Entrega 3, E09 a E15).
const { body, query } = require("express-validator");
const { validar, soloCampos, idEnRuta, booleanoEnConsulta, esBooleanoJson, reglasPaginacion } = require("@caseta/shared");

const texto = (campo, max) => body(campo)
  .isString().withMessage("Debe ser texto.").bail()
  .trim().isLength({ min: 1, max }).withMessage(`Debe tener entre 1 y ${max} caracteres.`);

// referencia acepta null para borrarla.
const referencia = () => body("referencia")
  .optional({ values: "undefined" })
  .custom((v) => {
    if (v === null) return true;
    if (typeof v !== "string") throw new Error("Debe ser texto o null.");
    if (v.trim().length > 120) throw new Error("Máximo 120 caracteres.");
    return true;
  })
  .customSanitizer((v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v));

const listar = [
  booleanoEnConsulta("activa"),
  query("q").optional().isString().trim().isLength({ max: 100 }).withMessage("Máximo 100 caracteres."),
  ...reglasPaginacion,
  validar,
];

const obtener = [idEnRuta("viviendaId"), validar];

const crear = [
  soloCampos(["calle", "numero", "referencia"]),
  texto("calle", 120),
  texto("numero", 10),
  referencia(),
  validar,
];

const actualizar = [
  idEnRuta("viviendaId"),
  soloCampos(["calle", "numero", "referencia", "activa"], { alMenosUno: true }),
  texto("calle", 120).optional(),
  texto("numero", 10).optional(),
  referencia(),
  body("activa").optional().custom(esBooleanoJson),
  validar,
];

const asignarResidente = [
  idEnRuta("viviendaId"),
  soloCampos(["usuarioId", "esTitular"]),
  body("usuarioId").custom((v) => {
    if (!Number.isInteger(v) || v < 1) throw new Error("Debe ser un número entero desde 1.");
    return true;
  }),
  body("esTitular").optional().custom(esBooleanoJson),
  validar,
];

const retirarResidente = [idEnRuta("viviendaId"), idEnRuta("usuarioId"), validar];

module.exports = { listar, obtener, crear, actualizar, asignarResidente, retirarResidente };
