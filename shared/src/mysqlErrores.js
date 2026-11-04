// Traduce los errores de MySQL al formato de la API (Entrega 4, "Cómo traduce el servicio los errores").
// - 1062 (llave duplicada): se convierte en el 409 que corresponde según el nombre de la restricción.
// - 3819 (CHECK) y 1452 (llave foránea) no deberían llegar porque la API valida antes;
//   si llegan, se dejan pasar y el manejador final responde 500 sin mostrar el detalle.
const { ErrorApi } = require("./errores");

function restriccionDuplicada(err) {
  if (!err || err.errno !== 1062) return null;
  // Mensaje de MySQL 8: "Duplicate entry 'x' for key 'tabla.uq_restriccion'"
  const m = /for key '(?:[^.']+\.)?([^']+)'/.exec(err.sqlMessage || err.message || "");
  return m ? m[1] : null;
}

// mapa: { nombre_restriccion: () => new ErrorApi(409, ...) }
function traducirDuplicado(err, mapa) {
  const restriccion = restriccionDuplicada(err);
  if (restriccion && mapa[restriccion]) return mapa[restriccion]();
  return err;
}

module.exports = { restriccionDuplicada, traducirDuplicado, ErrorApi };
