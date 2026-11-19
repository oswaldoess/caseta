// Acceso a datos para sesiones (S1): contraseña de un usuario y tokens revocados.
const { consultar } = require("@caseta/shared");

// Único lugar donde se lee contrasena_hash; nunca sale de este servicio.
async function buscarCredenciales({ correo, id }) {
  const [campo, valor] = correo !== undefined ? ["correo", correo] : ["id", id];
  const filas = await consultar(
    `SELECT id, nombre_completo, rol, activo, contrasena_hash FROM usuarios WHERE ${campo} = ?`,
    [valor],
  );
  return filas[0] || null;
}

async function cambiarContrasena(id, contrasenaHash) {
  await consultar("UPDATE usuarios SET contrasena_hash = ? WHERE id = ?", [contrasenaHash, id]);
}

// expira: segundos Unix del token; el registro sirve hasta que el token habría expirado.
async function revocarToken({ jti, usuarioId, expira }) {
  await consultar(
    // IGNORE: cerrar dos veces la misma sesión no es un error (el usuario de MySQL no tiene UPDATE aquí).
    `INSERT IGNORE INTO tokens_revocados (jti, usuario_id, expira_en)
     VALUES (?, ?, FROM_UNIXTIME(?))`,
    [jti, usuarioId, expira],
  );
}

// I01: el token está revocado, o la cuenta ya no está activa (una cuenta desactivada no conserva sus sesiones).
async function estadoToken(jti, usuarioId) {
  const [fila] = await consultar(
    `SELECT EXISTS (SELECT 1 FROM tokens_revocados WHERE jti = ?) AS revocado,
            (SELECT activo FROM usuarios WHERE id = ?) AS activo`,
    [jti, usuarioId],
  );
  return { revocado: Boolean(fila.revocado), activo: fila.activo === null ? false : Boolean(fila.activo) };
}

// Limpieza: los tokens que ya expiraron no necesitan seguir en la tabla.
async function borrarRevocadosVencidos() {
  await consultar("DELETE FROM tokens_revocados WHERE expira_en < NOW()");
}

module.exports = { buscarCredenciales, cambiarContrasena, revocarToken, estadoToken, borrarRevocadosVencidos };
