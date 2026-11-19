// Acceso a datos de visitas, días y usos de código (S3). Solo aquí se escribe SQL.
// Las funciones que escriben reciben "db": la conexión de una transacción o, por defecto, el pool.
const { consultar, patronLike } = require("@caseta/shared");

const directo = { consultar };

// Una visita activa cuya fecha final ya pasó se reporta como vencida, sin necesidad de un proceso nocturno.
const ESTADO_ACTUAL = "CASE WHEN v.estado = 'activa' AND v.fecha_fin < CURDATE() THEN 'vencida' ELSE v.estado END";

const SELECT_VISITA = `
  SELECT v.id, v.tipo, ${ESTADO_ACTUAL} AS estado, v.codigo, v.vivienda_id, v.domicilio, v.residente_id,
         v.nombre_visitante, v.placas, v.numero_personas, v.fecha_inicio, v.fecha_fin, v.hora_inicio, v.hora_fin,
         v.autorizado_por, v.creada_en, v.actualizada_en,
         EXISTS (SELECT 1 FROM visita_usos u WHERE u.visita_id = v.id) AS tiene_entradas,
         (SELECT GROUP_CONCAT(d.dia ORDER BY FIELD(d.dia, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'))
            FROM visita_dias d WHERE d.visita_id = v.id) AS dias
  FROM visitas v`;

function armarFiltros({ viviendaId, estado, tipo, validaEn, diaValidaEn, desde, hasta, q }) {
  const condiciones = [];
  const valores = [];
  if (viviendaId !== undefined) { condiciones.push("v.vivienda_id = ?"); valores.push(viviendaId); }
  if (estado !== undefined) { condiciones.push(`${ESTADO_ACTUAL} = ?`); valores.push(estado); }
  if (tipo !== undefined) { condiciones.push("v.tipo = ?"); valores.push(tipo); }
  if (validaEn !== undefined) {
    // Válida ese día: activa, dentro de su vigencia y, si es frecuente, en uno de sus días.
    condiciones.push(`${ESTADO_ACTUAL} = 'activa' AND v.fecha_inicio <= ? AND v.fecha_fin >= ?
      AND (v.tipo <> 'frecuente' OR EXISTS (SELECT 1 FROM visita_dias d WHERE d.visita_id = v.id AND d.dia = ?))`);
    valores.push(validaEn, validaEn, diaValidaEn);
  }
  if (desde !== undefined) { condiciones.push("v.fecha_fin >= ?"); valores.push(desde); }
  if (hasta !== undefined) { condiciones.push("v.fecha_inicio <= ?"); valores.push(hasta); }
  if (q !== undefined && q !== "") {
    condiciones.push("(v.nombre_visitante LIKE ? OR v.domicilio LIKE ?)");
    valores.push(patronLike(q), patronLike(q));
  }
  return { where: condiciones.length ? "WHERE " + condiciones.join(" AND ") : "", valores };
}

async function listar(filtros, { limite, desplazamiento }) {
  const { where, valores } = armarFiltros(filtros);
  const filas = await consultar(
    `${SELECT_VISITA} ${where}
     ORDER BY v.fecha_inicio DESC, v.hora_inicio, v.id DESC
     LIMIT ${Number(limite)} OFFSET ${Number(desplazamiento)}`,
    valores,
  );
  const [{ total }] = await consultar(`SELECT COUNT(*) AS total FROM visitas v ${where}`, valores);
  return { filas, total };
}

async function buscarPorId(id, db = directo) {
  const filas = await db.consultar(`${SELECT_VISITA} WHERE v.id = ?`, [id]);
  return filas[0] || null;
}

async function buscarPorCodigo(codigo) {
  const filas = await consultar(`${SELECT_VISITA} WHERE v.codigo = ?`, [codigo]);
  return filas[0] || null;
}

async function existeCodigo(codigo, db = directo) {
  const [fila] = await db.consultar("SELECT EXISTS (SELECT 1 FROM visitas WHERE codigo = ?) AS existe", [codigo]);
  return Boolean(fila.existe);
}

// RN03: personas ya registradas para una vivienda en una fecha (visitas de un solo día que no estén canceladas).
async function personasRegistradas(viviendaId, fecha, excluirVisitaId = 0) {
  const [fila] = await consultar(
    `SELECT COALESCE(SUM(numero_personas), 0) AS personas
     FROM visitas
     WHERE vivienda_id = ? AND tipo IN ('unica', 'no_programada') AND estado <> 'cancelada'
       AND fecha_inicio = ? AND id <> ?`,
    [viviendaId, fecha, excluirVisitaId],
  );
  return Number(fila.personas);
}

async function crear(db, d) {
  const r = await db.consultar(
    `INSERT INTO visitas (tipo, codigo, vivienda_id, domicilio, residente_id, nombre_visitante, placas,
                          numero_personas, fecha_inicio, fecha_fin, hora_inicio, hora_fin, autorizado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.tipo, d.codigo ?? null, d.viviendaId, d.domicilio, d.residenteId ?? null, d.nombreVisitante, d.placas ?? null,
      d.numeroPersonas, d.fechaInicio, d.fechaFin, d.horaInicio ?? null, d.horaFin ?? null, d.autorizadoPor ?? null],
  );
  if (d.diasSemana && d.diasSemana.length) await guardarDias(db, r.insertId, d.diasSemana);
  return r.insertId;
}

async function guardarDias(db, visitaId, dias) {
  await db.consultar("DELETE FROM visita_dias WHERE visita_id = ?", [visitaId]);
  const marcas = dias.map(() => "(?, ?)").join(", ");
  await db.consultar(`INSERT INTO visita_dias (visita_id, dia) VALUES ${marcas}`, dias.flatMap((dia) => [visitaId, dia]));
}

const COLUMNA_DE = {
  nombreVisitante: "nombre_visitante", placas: "placas", numeroPersonas: "numero_personas",
  fechaInicio: "fecha_inicio", fechaFin: "fecha_fin", horaInicio: "hora_inicio", horaFin: "hora_fin",
};

async function actualizar(db, id, cambios) {
  const campos = Object.keys(cambios).filter((c) => COLUMNA_DE[c] && cambios[c] !== undefined);
  if (campos.length) {
    const sets = campos.map((c) => `${COLUMNA_DE[c]} = ?`).join(", ");
    await db.consultar(`UPDATE visitas SET ${sets} WHERE id = ?`, [...campos.map((c) => cambios[c]), id]);
  }
  if (cambios.diasSemana) await guardarDias(db, id, cambios.diasSemana);
}

// E20: solo se cancela si sigue activa, no ha vencido y no tiene entradas (todo en la misma sentencia).
async function cancelar(id) {
  const r = await consultar(
    `UPDATE visitas v SET v.estado = 'cancelada'
     WHERE v.id = ? AND v.estado = 'activa' AND v.fecha_fin >= CURDATE()
       AND NOT EXISTS (SELECT 1 FROM visita_usos u WHERE u.visita_id = v.id)`,
    [id],
  );
  return r.affectedRows;
}

// ----- Uso de un código (I07), dentro de una transacción -----

// Bloquea la fila de la visita hasta que termine la transacción: si dos guardias usan
// el mismo código al mismo tiempo, el segundo espera y luego ve la visita ya utilizada.
async function bloquearVisita(db, id) {
  const filas = await db.consultar("SELECT id, tipo, estado, fecha_fin FROM visitas WHERE id = ? FOR UPDATE", [id]);
  return filas[0] || null;
}

async function marcarUtilizada(db, id) {
  await db.consultar("UPDATE visitas SET estado = 'utilizada' WHERE id = ? AND estado = 'activa'", [id]);
}

async function marcarCancelada(db, id) {
  await db.consultar("UPDATE visitas SET estado = 'cancelada' WHERE id = ?", [id]);
}

async function registrarUso(db, visitaId, accesoId) {
  await db.consultar("INSERT INTO visita_usos (visita_id, acceso_id) VALUES (?, ?)", [visitaId, accesoId]);
}

async function contarUsos(db, visitaId) {
  const [fila] = await db.consultar("SELECT COUNT(*) AS usos FROM visita_usos WHERE visita_id = ?", [visitaId]);
  return Number(fila.usos);
}

module.exports = {
  listar, buscarPorId, buscarPorCodigo, existeCodigo, personasRegistradas, crear, actualizar, cancelar,
  bloquearVisita, marcarUtilizada, marcarCancelada, registrarUso, contarUsos,
};
