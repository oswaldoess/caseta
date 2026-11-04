// Acceso a datos de la tabla usuarios (S1). Solo aquí se escribe SQL.
// Nunca se selecciona contrasena_hash fuera de lo estrictamente necesario.
const { consultar, patronLike } = require("@caseta/shared");

const COLUMNAS = "id, nombre_completo, correo, telefono, rol, activo, creado_en, actualizado_en";

function armarFiltros({ rol, activo, q }) {
  const condiciones = [];
  const valores = [];
  if (rol !== undefined) { condiciones.push("rol = ?"); valores.push(rol); }
  if (activo !== undefined) { condiciones.push("activo = ?"); valores.push(activo ? 1 : 0); }
  if (q !== undefined && q !== "") {
    condiciones.push("(nombre_completo LIKE ? OR correo LIKE ?)");
    valores.push(patronLike(q), patronLike(q));
  }
  return { where: condiciones.length ? "WHERE " + condiciones.join(" AND ") : "", valores };
}

async function listar(filtros, { limite, desplazamiento }) {
  const { where, valores } = armarFiltros(filtros);
  // LIMIT y OFFSET ya son enteros validados; se insertan como números.
  const filas = await consultar(
    `SELECT ${COLUMNAS} FROM usuarios ${where}
     ORDER BY creado_en DESC, id DESC
     LIMIT ${Number(limite)} OFFSET ${Number(desplazamiento)}`,
    valores,
  );
  const [{ total }] = await consultar(`SELECT COUNT(*) AS total FROM usuarios ${where}`, valores);
  return { filas, total };
}

async function buscarPorId(id) {
  const filas = await consultar(`SELECT ${COLUMNAS} FROM usuarios WHERE id = ?`, [id]);
  return filas[0] || null;
}

async function crear({ nombreCompleto, correo, telefono, rol, contrasenaHash }) {
  const resultado = await consultar(
    `INSERT INTO usuarios (nombre_completo, correo, telefono, rol, contrasena_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [nombreCompleto, correo, telefono, rol, contrasenaHash],
  );
  return resultado.insertId;
}

const COLUMNA_DE = { nombreCompleto: "nombre_completo", telefono: "telefono", rol: "rol", activo: "activo" };

async function actualizar(id, cambios) {
  const campos = Object.keys(cambios).filter((c) => COLUMNA_DE[c]);
  if (!campos.length) return 0;
  const sets = campos.map((c) => `${COLUMNA_DE[c]} = ?`).join(", ");
  const valores = campos.map((c) => (c === "activo" ? (cambios[c] ? 1 : 0) : cambios[c]));
  const resultado = await consultar(`UPDATE usuarios SET ${sets} WHERE id = ?`, [...valores, id]);
  return resultado.affectedRows;
}

module.exports = { listar, buscarPorId, crear, actualizar };
