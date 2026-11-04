// Reglas de validación de los contratos de usuarios (Entrega 3, E05 a E08).
const { body, query } = require("express-validator");
const { validar, soloCampos, idEnRuta, booleanoEnConsulta, esBooleanoJson, reglasPaginacion } = require("@caseta/shared");

const ROLES = ["residente", "guardia", "administrador"];

const nombreCompleto = () => body("nombreCompleto")
  .isString().withMessage("Debe ser texto.").bail()
  .trim().isLength({ min: 3, max: 120 }).withMessage("Debe tener entre 3 y 120 caracteres.");
const telefono = () => body("telefono")
  .isString().withMessage("Debe ser texto.").bail()
  .matches(/^[0-9]{10}$/).withMessage("Debe tener exactamente 10 dígitos.");
const rol = () => body("rol").isIn(ROLES).withMessage(`Debe ser uno de: ${ROLES.join(", ")}.`);

const listar = [
  query("rol").optional().isIn(ROLES).withMessage(`Debe ser uno de: ${ROLES.join(", ")}.`),
  booleanoEnConsulta("activo"),
  query("q").optional().isString().trim().isLength({ max: 100 }).withMessage("Máximo 100 caracteres."),
  ...reglasPaginacion,
  validar,
];

const obtener = [idEnRuta("usuarioId"), validar];

const crear = [
  soloCampos(["nombreCompleto", "correo", "telefono", "rol", "contrasenaInicial"]),
  nombreCompleto(),
  body("correo")
    .isString().withMessage("Debe ser texto.").bail()
    .trim().toLowerCase()
    .isEmail().withMessage("Debe ser un correo válido.").bail()
    .isLength({ max: 160 }).withMessage("Máximo 160 caracteres."),
  telefono(),
  rol(),
  body("contrasenaInicial")
    .isString().withMessage("Debe ser texto.").bail()
    .isLength({ min: 8, max: 72 }).withMessage("Debe tener entre 8 y 72 caracteres."),
  validar,
];

const actualizar = [
  idEnRuta("usuarioId"),
  soloCampos(["nombreCompleto", "telefono", "rol", "activo"], { alMenosUno: true }),
  nombreCompleto().optional(),
  telefono().optional(),
  rol().optional(),
  body("activo").optional().custom(esBooleanoJson),
  validar,
];

module.exports = { listar, obtener, crear, actualizar };
