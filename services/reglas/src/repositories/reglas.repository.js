// Acceso a datos de adeudos y parámetros (S5). Solo aquí se escribe SQL.
const { consultar } = require("@caseta/shared");

const COLUMNAS_ADEUDO = "id, vivienda_id, concepto, periodo, monto, estado, registrado_en, liquidado_en";

function filtrosAdeudos({ viviendaId, estado }) {
  const condiciones = [];
  const valores = [];
  if (viviendaId !== undefined) { condiciones.push("vivienda_id = ?"); valores.push(viviendaId); }
  if (estado !== undefined) { condiciones.push("estado = ?"); valores.push(estado); }
  return { where: condiciones.length ? "WHERE " + condiciones.join(" AND ") : "", valores };
}

async function listarAdeudos(filtros, { limite, desplazamiento }) {
  const { where, valores } = filtrosAdeudos(filtros);
  const filas = await consultar(
    `SELECT ${COLUMNAS_ADEUDO} FROM adeudos ${where}
     ORDER BY registrado_en DESC, id DESC
     LIMIT ${Number(limite)} OFFSET ${Number(desplazamiento)}`,
    valores,
  );
  const [{ total }] = await consultar(`SELECT COUNT(*) AS total FROM adeudos ${where}`, valores);
  return { filas, total };
}

async function buscarAdeudo(id) {
  const filas = await consultar(`SELECT ${COLUMNAS_ADEUDO} FROM adeudos WHERE id = ?`, [id]);
  return filas[0] || null;
}

async function crearAdeudo({ viviendaId, concepto, periodo, monto }) {
  const r = await consultar(
    "INSERT INTO adeudos (vivienda_id, concepto, periodo, monto) VALUES (?, ?, ?, ?)",
    [viviendaId, concepto, periodo, monto],
  );
  return r.insertId;
}

// La condición estado = 'pendiente' hace la operación atómica: si dos administradores
// liquidan al mismo tiempo, solo uno cambia la fila.
async function liquidarAdeudo(id) {
  const r = await consultar(
    "UPDATE adeudos SET estado = 'liquidado', liquidado_en = NOW() WHERE id = ? AND estado = 'pendiente'",
    [id],
  );
  return r.affectedRows;
}

async function tieneAdeudoPendiente(viviendaId) {
  const [fila] = await consultar(
    "SELECT EXISTS (SELECT 1 FROM adeudos WHERE vivienda_id = ? AND estado = 'pendiente') AS pendiente",
    [viviendaId],
  );
  return Boolean(fila.pendiente);
}

// ----- Parámetros -----

const COLUMNAS_PARAMETRO = "clave, valor, descripcion, minimo, maximo, actualizado_en";

async function listarParametros() {
  return consultar(`SELECT ${COLUMNAS_PARAMETRO} FROM parametros ORDER BY clave`);
}

async function buscarParametro(clave) {
  const filas = await consultar(`SELECT ${COLUMNAS_PARAMETRO} FROM parametros WHERE clave = ?`, [clave]);
  return filas[0] || null;
}

async function actualizarParametro(clave, valor, usuarioId) {
  await consultar("UPDATE parametros SET valor = ?, actualizado_por = ? WHERE clave = ?", [valor, usuarioId, clave]);
}

module.exports = {
  listarAdeudos, buscarAdeudo, crearAdeudo, liquidarAdeudo, tieneAdeudoPendiente,
  listarParametros, buscarParametro, actualizarParametro,
};
