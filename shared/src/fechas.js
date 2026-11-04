// Fechas en el formato de la API (Entrega 3): ISO 8601 con la zona de la Ciudad de México.

// "2026-10-24 18:07:12" (DATETIME de MySQL) -> "2026-10-24T18:07:12-06:00"
function aIso(valor) {
  if (valor === null || valor === undefined) return null;
  return String(valor).replace(" ", "T") + "-06:00";
}

// "2026-10-24" (DATE de MySQL) se devuelve tal cual.
function aFecha(valor) {
  if (valor === null || valor === undefined) return null;
  return String(valor).slice(0, 10);
}

module.exports = { aIso, aFecha };
