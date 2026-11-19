// Reglas de validación de adeudos y parámetros (Entrega 3, E27 a E32, I04 e I05).
const { body, param, query } = require("express-validator");
const {
  validar, soloCampos, idEnRuta, reglasPaginacion, esEnteroJson, esFecha,
} = require("@caseta/shared");

const CLAVES = ["limite_personas_con_adeudo", "tolerancia_minutos"];

const listarAdeudos = [
  query("viviendaId").optional().isInt({ min: 1 }).withMessage("Debe ser un número entero desde 1.").toInt(),
  query("estado").optional().isIn(["pendiente", "liquidado"]).withMessage("Debe ser pendiente o liquidado."),
  ...reglasPaginacion,
  validar,
];

const obtenerAdeudo = [idEnRuta("adeudoId"), validar];

const crearAdeudo = [
  soloCampos(["viviendaId", "concepto", "periodo", "monto"]),
  body("viviendaId").custom(esEnteroJson(1)),
  body("concepto")
    .isString().withMessage("Debe ser texto.").bail()
    .trim().isLength({ min: 3, max: 80 }).withMessage("Debe tener entre 3 y 80 caracteres."),
  body("periodo")
    .isString().withMessage("Debe ser texto.").bail()
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/).withMessage("Debe tener el formato AAAA-MM."),
  body("monto").custom((v) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0.01 || v > 99999999.99) {
      throw new Error("Debe ser un número mayor que 0.");
    }
    if (Math.round(v * 100) !== Number((v * 100).toFixed(6))) throw new Error("Máximo dos decimales.");
    return true;
  }),
  validar,
];

const liquidarAdeudo = [
  idEnRuta("adeudoId"),
  soloCampos(["estado"]),
  body("estado").equals("liquidado").withMessage("Solo se permite el valor liquidado."),
  validar,
];

const claveEnRuta = param("clave").isIn(CLAVES).withMessage(`Debe ser una de: ${CLAVES.join(", ")}.`);

const actualizarParametro = [
  claveEnRuta,
  soloCampos(["valor"]),
  body("valor").custom(esEnteroJson(0)),
  validar,
];

const parametroInterno = [claveEnRuta, validar];

const evaluarLimite = [
  body("viviendaId").custom(esEnteroJson(1)),
  body("fecha").custom((v) => { if (!esFecha(v)) throw new Error("Debe ser una fecha AAAA-MM-DD."); return true; }),
  body("personasSolicitadas").custom(esEnteroJson(1)),
  body("personasYaRegistradas").custom(esEnteroJson(0)),
  validar,
];

module.exports = {
  listarAdeudos, obtenerAdeudo, crearAdeudo, liquidarAdeudo, actualizarParametro, parametroInterno, evaluarLimite,
};
