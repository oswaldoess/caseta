// Utilidades compartidas por las pruebas de integración.
const request = require("supertest");

const API = "http://localhost:3000";
const api = () => request(API);
const CONTRASENA = "Caseta2026!";
const CUENTAS = {
  administrador: "patricia.gomez@correo.com",
  residente: "carlos.ramirez@correo.com",   // vivienda 1
  residente2: "monica.herrera@correo.com",  // vivienda 3
  guardia: "miguel.torres@correo.com",
};

async function iniciarSesion(correo, contrasena = CONTRASENA) {
  const r = await api().post("/api/v1/sesiones").send({ correo, contrasena });
  if (r.status !== 201) throw new Error(`No se pudo iniciar sesión con ${correo}: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.token;
}

async function tokensDePrueba() {
  const entradas = await Promise.all(Object.entries(CUENTAS).map(async ([rol, correo]) => [rol, await iniciarSesion(correo)]));
  return Object.fromEntries(entradas);
}

// Fecha y horario de hoy en la Ciudad de México, para que las visitas sean válidas al momento de la prueba.
function hoy() {
  const d = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const min = d.getUTCHours() * 60 + d.getUTCMinutes();
  const hhmm = (m) => { m = Math.max(0, Math.min(1439, m)); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  return {
    fecha: d.toISOString().slice(0, 10),
    horaInicio: hhmm(min - 60),
    horaFin: hhmm(min + 120),
    dia: ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][d.getUTCDay()],
  };
}

const visitaUnica = (nombre, personas, extra = {}) => {
  const h = hoy();
  return { tipo: "unica", nombreVisitante: nombre, numeroPersonas: personas, fecha: h.fecha, horaInicio: h.horaInicio, horaFin: h.horaFin, ...extra };
};

// Comprueba el formato estándar de error y devuelve el objeto error.
function esperarError(r, estado, codigo) {
  expect(r.status).toBe(estado);
  expect(Object.keys(r.body.error)).toEqual(["codigo", "mensaje", "estado", "detalles", "ruta", "fecha", "idSolicitud"]);
  expect(r.body.error.codigo).toBe(codigo);
  return r.body.error;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { api, auth, iniciarSesion, tokensDePrueba, hoy, visitaUnica, esperarError, CUENTAS, CONTRASENA };
