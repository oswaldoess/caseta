// Acceso a datos de viviendas y residentes_vivienda (S2). Solo aquí se escribe SQL.
const { consultar, patronLike } = require("@caseta/shared");

// totalResidentes no se guarda (3FN): se cuenta al consultar (Entrega 4, consulta C05).
const SELECT_VIVIENDA = `
  SELECT v.id, v.calle, v.numero, v.referencia, v.activa, v.creada_en, v.actualizada_en,
         (SELECT COUNT(*) FROM residentes_vivienda r WHERE r.vivienda_id = v.id) AS total_residentes
  FROM viviendas v`;

function armarFiltros({ activa, q }) {
  const condiciones = [];
  const valores = [];
  if (activa !== undefined) { condiciones.push("v.activa = ?"); valores.push(activa ? 1 : 0); }
  if (q !== undefined && q !== "") {
    condiciones.push("(v.calle LIKE ? OR v.numero LIKE ? OR CONCAT(v.calle, ' ', v.numero) LIKE ?)");
    valores.push(patronLike(q), patronLike(q), patronLike(q));
  }
  return { where: condiciones.length ? "WHERE " + condiciones.join(" AND ") : "", valores };
}

async function listar(filtros, { limite, desplazamiento }) {
  const { where, valores } = armarFiltros(filtros);
  const filas = await consultar(
    `${SELECT_VIVIENDA} ${where}
     ORDER BY v.creada_en DESC, v.id DESC
     LIMIT ${Number(limite)} OFFSET ${Number(desplazamiento)}`,
    valores,
  );
  const [{ total }] = await consultar(`SELECT COUNT(*) AS total FROM viviendas v ${where}`, valores);
  return { filas, total };
}

async function buscarPorId(id) {
  const filas = await consultar(`${SELECT_VIVIENDA} WHERE v.id = ?`, [id]);
  return filas[0] || null;
}

async function crear({ calle, numero, referencia }) {
  const r = await consultar(
    "INSERT INTO viviendas (calle, numero, referencia) VALUES (?, ?, ?)",
    [calle, numero, referencia ?? null],
  );
  return r.insertId;
}

const COLUMNA_DE = { calle: "calle", numero: "numero", referencia: "referencia", activa: "activa" };

async function actualizar(id, cambios) {
  const campos = Object.keys(cambios).filter((c) => COLUMNA_DE[c]);
  if (!campos.length) return 0;
  const sets = campos.map((c) => `${COLUMNA_DE[c]} = ?`).join(", ");
  const valores = campos.map((c) => (c === "activa" ? (cambios[c] ? 1 : 0) : cambios[c]));
  const r = await consultar(`UPDATE viviendas SET ${sets} WHERE id = ?`, [...valores, id]);
  return r.affectedRows;
}

// ----- Residentes de una vivienda -----

async function listarResidentes(viviendaId) {
  return consultar(
    `SELECT usuario_id, es_titular, fecha_alta FROM residentes_vivienda
     WHERE vivienda_id = ? ORDER BY es_titular DESC, fecha_alta, id`,
    [viviendaId],
  );
}

// Vivienda en la que ya está asignado un residente (para explicar el 409).
async function asignacionDeUsuario(usuarioId) {
  const filas = await consultar(
    `SELECT r.vivienda_id, CONCAT(v.calle, ' ', v.numero) AS domicilio
     FROM residentes_vivienda r JOIN viviendas v ON v.id = r.vivienda_id
     WHERE r.usuario_id = ?`,
    [usuarioId],
  );
  return filas[0] || null;
}

async function buscarAsignacion(viviendaId, usuarioId) {
  const filas = await consultar(
    "SELECT usuario_id, es_titular, fecha_alta FROM residentes_vivienda WHERE vivienda_id = ? AND usuario_id = ?",
    [viviendaId, usuarioId],
  );
  return filas[0] || null;
}

async function asignarResidente(viviendaId, usuarioId, esTitular) {
  await consultar(
    "INSERT INTO residentes_vivienda (vivienda_id, usuario_id, es_titular) VALUES (?, ?, ?)",
    [viviendaId, usuarioId, esTitular ? 1 : 0],
  );
}

async function retirarResidente(viviendaId, usuarioId) {
  const r = await consultar(
    "DELETE FROM residentes_vivienda WHERE vivienda_id = ? AND usuario_id = ?",
    [viviendaId, usuarioId],
  );
  return r.affectedRows;
}

module.exports = {
  listar, buscarPorId, crear, actualizar,
  listarResidentes, asignacionDeUsuario, buscarAsignacion, asignarResidente, retirarResidente,
};
