// Reglas de validación de sesiones y contraseña (Entrega 3, E01 y E04).
const { body, param, query } = require("express-validator");
const { validar, soloCampos } = require("@caseta/shared");

const iniciar = [
  soloCampos(["correo", "contrasena"]),
  body("correo")
    .isString().withMessage("Debe ser texto.").bail()
    .trim().toLowerCase()
    .isEmail().withMessage("Debe ser un correo válido."),
  body("contrasena")
    .isString().withMessage("Debe ser texto.").bail()
    .isLength({ min: 1, max: 72 }).withMessage("Escribe tu contraseña."),
  validar,
];

const cambiarContrasena = [
  soloCampos(["contrasenaActual", "contrasenaNueva"]),
  body("contrasenaActual")
    .isString().withMessage("Debe ser texto.").bail()
    .isLength({ min: 1, max: 72 }).withMessage("Escribe tu contraseña actual."),
  body("contrasenaNueva")
    .isString().withMessage("Debe ser texto.").bail()
    .isLength({ min: 8, max: 72 }).withMessage("Debe tener entre 8 y 72 caracteres."),
  validar,
];

const estadoToken = [
  param("jti").isUUID().withMessage("Debe ser un identificador de token válido."),
  query("usuarioId").isInt({ min: 1 }).withMessage("Debe ser un número entero desde 1.").toInt(),
  validar,
];

module.exports = { iniciar, cambiarContrasena, estadoToken };
