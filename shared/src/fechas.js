// Fechas en el formato de la API (Entrega 3): ISO 8601 con la zona de la Ciudad de México.
// La Ciudad de México usa UTC-6 todo el año (sin horario de verano desde 2022).

const DESFASE_MS = 6 * 60 * 60 * 1000;
const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

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

// "18:00:00" (TIME de MySQL) -> "18:00"
function aHora(valor) {
  if (valor === null || valor === undefined) return null;
  return String(valor).slice(0, 5);
}

// Momento actual en hora de la Ciudad de México.
// { fecha: "2026-11-18", hora: "18:27", minutos: 1107, diaSemana: "miercoles", fechaHora: "2026-11-18 18:27:05" }
function ahoraLocal() {
  const d = new Date(Date.now() - DESFASE_MS);
  const iso = d.toISOString();
  return {
    fecha: iso.slice(0, 10),
    hora: iso.slice(11, 16),
    minutos: d.getUTCHours() * 60 + d.getUTCMinutes(),
    diaSemana: DIAS[d.getUTCDay()],
    fechaHora: iso.slice(0, 19).replace("T", " "),
  };
}

// Día de la semana de una fecha "AAAA-MM-DD" ("lunes", "martes", ...).
function diaSemana(fecha) {
  return DIAS[new Date(fecha + "T00:00:00Z").getUTCDay()];
}

// Suma días a una fecha "AAAA-MM-DD".
function sumarDias(fecha, dias) {
  const d = new Date(fecha + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Suma meses a una fecha "AAAA-MM-DD" (31 de agosto + 6 meses = 28 de febrero).
function sumarMeses(fecha, meses) {
  const [a, m, d] = fecha.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(a, m - 1 + meses + 1, 0)).getUTCDate();
  return new Date(Date.UTC(a, m - 1 + meses, Math.min(d, ultimoDia))).toISOString().slice(0, 10);
}

// "18:30" -> 1110 minutos desde la medianoche.
function aMinutos(hora) {
  const [h, m] = String(hora).split(":").map(Number);
  return h * 60 + m;
}

// 1110 -> "18:30" (se limita al día: de 00:00 a 23:59).
function deMinutos(min) {
  const v = Math.max(0, Math.min(23 * 60 + 59, min));
  return String(Math.floor(v / 60)).padStart(2, "0") + ":" + String(v % 60).padStart(2, "0");
}

// "2026-10-24" -> "24/10/2026" para los mensajes.
function fechaLegible(fecha) {
  const [a, m, d] = String(fecha).slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

module.exports = { aIso, aFecha, aHora, ahoraLocal, diaSemana, sumarDias, sumarMeses, aMinutos, deMinutos, fechaLegible, DIAS };
