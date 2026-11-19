// Acceso a datos de accesos y observaciones (S4). Solo aquí se escribe SQL.
// Las funciones que escriben reciben "db": la conexión de una transacción o, por defecto, el pool.
const { consultar } = require("@caseta/shared");

const directo = { consultar };

// Las observaciones viven en su propia tabla (RN08: el acceso no se edita) y se unen en un texto.
const SELECT_ACCESO = `
  SELECT a.id, a.visita_id, a.tipo_visita, a.nombre_visitante, a.numero_personas, a.vivienda_id, a.domicilio,
         a.residente_id, a.entrada, a.guardia_entrada_id, a.salida, a.guardia_salida_id,
         (SELECT GROUP_CONCAT(o.texto ORDER BY o.creada_en, o.id SEPARATOR ' | ')
            FROM observaciones_acceso o WHERE o.acceso_id = a.id) AS observaciones
  FROM accesos a`;

// Lo que puede ver un guardia: lo de hoy y a quien siga dentro (aunque haya entrado ayer).
const ALCANCE_GUARDIA = "(DATE(a.entrada) = CURDATE() OR a.salida IS NULL)";

function armarFiltros({ viviendaId, residenteId, tipoVisita, dentro, desde, hasta, alcanceGuardia }) {
  const condiciones = [];
  const valores = [];
  if (viviendaId !== undefined) { condiciones.push("a.vivienda_id = ?"); valores.push(viviendaId); }
  if (residenteId !== undefined) { condiciones.push("a.residente_id = ?"); valores.push(residenteId); }
  if (tipoVisita !== undefined) { condiciones.push("a.tipo_visita = ?"); valores.push(tipoVisita); }
  if (dentro === true) condiciones.push("a.salida IS NULL");
  if (dentro === false) condiciones.push("a.salida IS NOT NULL");
  if (desde !== undefined) { condiciones.push("a.entrada >= ?"); valores.push(`${desde} 00:00:00`); }
  if (hasta !== undefined) { condiciones.push("a.entrada <= ?"); valores.push(`${hasta} 23:59:59`); }
  if (alcanceGuardia) condiciones.push(ALCANCE_GUARDIA);
  return { where: condiciones.length ? "WHERE " + condiciones.join(" AND ") : "", valores };
}

async function listar(filtros, { limite, desplazamiento }) {
  const { where, valores } = armarFiltros(filtros);
  const filas = await consultar(
    `${SELECT_ACCESO} ${where}
     ORDER BY a.entrada DESC, a.id DESC
     LIMIT ${Number(limite)} OFFSET ${Number(desplazamiento)}`,
    valores,
  );
  const [{ total }] = await consultar(`SELECT COUNT(*) AS total FROM accesos a ${where}`, valores);
  return { filas, total };
}

async function buscarPorId(id, db = directo) {
  const filas = await db.consultar(`${SELECT_ACCESO} WHERE a.id = ?`, [id]);
  return filas[0] || null;
}

async function dentroDeAlcanceGuardia(id) {
  const [fila] = await consultar(`SELECT EXISTS (SELECT 1 FROM accesos a WHERE a.id = ? AND ${ALCANCE_GUARDIA}) AS ok`, [id]);
  return Boolean(fila.ok);
}

// RN05: ¿la visita ya está dentro (entró y no ha salido)?
async function visitaDentro(visitaId) {
  const [fila] = await consultar(
    "SELECT EXISTS (SELECT 1 FROM accesos WHERE visita_id = ? AND salida IS NULL) AS dentro", [visitaId]);
  return Boolean(fila.dentro);
}

async function crear(db, d) {
  const r = await db.consultar(
    `INSERT INTO accesos (visita_id, tipo_visita, nombre_visitante, numero_personas, vivienda_id, domicilio,
                          residente_id, guardia_entrada_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.visitaId, d.tipoVisita, d.nombreVisitante, d.numeroPersonas, d.viviendaId, d.domicilio, d.residenteId ?? null, d.guardiaId],
  );
  return r.insertId;
}

async function agregarObservacion(db, accesoId, usuarioId, texto) {
  await db.consultar("INSERT INTO observaciones_acceso (acceso_id, usuario_id, texto) VALUES (?, ?, ?)", [accesoId, usuarioId, texto]);
}

// RN07: una sola salida por acceso. La condición salida IS NULL hace la operación atómica.
async function registrarSalida(db, id, guardiaId) {
  const r = await db.consultar(
    "UPDATE accesos SET salida = NOW(), guardia_salida_id = ? WHERE id = ? AND salida IS NULL", [guardiaId, id]);
  return r.affectedRows;
}

module.exports = {
  listar, buscarPorId, dentroDeAlcanceGuardia, visitaDentro, crear, agregarObservacion, registrarSalida,
};
