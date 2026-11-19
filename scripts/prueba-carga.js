// Prueba de carga básica (Entrega 7, RNF04):
// "La validación de un código responde en menos de 1 segundo con 50 peticiones simultáneas".
//
// Uso: con los servicios corriendo (npm run dev), ejecutar  npm run prueba:carga
// Variables opcionales: URL_API (http://localhost:3000/api/v1), CONEXIONES (50), RONDAS (20), DURACION (15 s).
//
// Fase 1: RONDAS rondas de CONEXIONES peticiones lanzadas exactamente al mismo tiempo (lo que pide RNF04).
// Fase 2: CONEXIONES clientes pidiendo sin pausa durante DURACION segundos (carga sostenida).
// Se mide cada petición de punta a punta: gateway + verificación del token (I01) + Accesos + Visitas (I06) + Reglas (I05).
const BASE = process.env.URL_API || "http://localhost:3000/api/v1";
const CONEXIONES = Number(process.env.CONEXIONES || 50);
const RONDAS = Number(process.env.RONDAS || 20);
const DURACION = Number(process.env.DURACION || 15);
const LIMITE_MS = 1000;

async function pedir(metodo, ruta, token, cuerpo) {
  const r = await fetch(BASE + ruta, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${metodo} ${ruta} respondió ${r.status}: ${JSON.stringify(datos)}`);
  return datos;
}

const login = async (correo) => (await pedir("POST", "/sesiones", null, { correo, contrasena: "Caseta2026!" })).token;

// Fecha y hora en Querétaro (UTC-6, sin horario de verano).
function enMexico(desplazamientoMin) {
  const d = new Date(Date.now() - 6 * 3600 * 1000 + desplazamientoMin * 60000).toISOString();
  return { fecha: d.slice(0, 10), hora: d.slice(11, 16) };
}

// Una petición medida: devuelve [milisegundos, estado HTTP, valido].
async function validar(url, token) {
  const inicio = performance.now();
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const cuerpo = await r.json();
    return [performance.now() - inicio, r.status, cuerpo.valido === true];
  } catch {
    return [performance.now() - inicio, 0, false];
  }
}

function resumen(nombre, medidas, segundos) {
  const ms = medidas.map((m) => m[0]).sort((a, b) => a - b);
  const p = (q) => Math.round(ms[Math.min(ms.length - 1, Math.floor(q * ms.length))]);
  const ok = medidas.filter((m) => m[1] === 200 && m[2]).length;
  const fila = (a, b) => console.log(`  ${a.padEnd(32)}${b}`);
  console.log(nombre);
  fila("Peticiones", medidas.length);
  fila("Peticiones por segundo", Math.round(medidas.length / segundos));
  fila("Latencia promedio (ms)", Math.round(ms.reduce((a, b) => a + b, 0) / ms.length));
  fila("Latencia p50 (ms)", p(0.5));
  fila("Latencia p95 (ms)", p(0.95));
  fila("Latencia p99 (ms)", p(0.99));
  fila("Latencia máxima (ms)", Math.round(ms[ms.length - 1]));
  fila("Respuestas 200 con valido=true", ok);
  fila("Errores o respuestas distintas", medidas.length - ok);
  console.log();
  return { p99: p(0.99), errores: medidas.length - ok };
}

(async () => {
  const guardia = await login("miguel.torres@correo.com");
  const residente = await login("carlos.ramirez@correo.com");
  const ini = enMexico(-60), fin = enMexico(120);
  const mismoDia = ini.fecha === fin.fecha;
  const visita = await pedir("POST", "/visitas", residente, {
    tipo: "unica", nombreVisitante: "Prueba de carga", numeroPersonas: 1, fecha: enMexico(0).fecha,
    horaInicio: mismoDia ? ini.hora : "00:00", horaFin: mismoDia ? fin.hora : "23:59",
  });
  const url = `${BASE}/codigos/${visita.codigo}/validez`;
  console.log(`Prueba de carga · GET ${url}`);
  console.log(`Rol guardia · ${new Date().toISOString()} · Node ${process.version}\n`);

  // Calentamiento: abre las conexiones y carga el código en memoria de cada proceso.
  await Promise.all(Array.from({ length: 10 }, () => validar(url, guardia)));

  let t0 = performance.now();
  const rondas = [];
  for (let i = 0; i < RONDAS; i++) {
    rondas.push(...(await Promise.all(Array.from({ length: CONEXIONES }, () => validar(url, guardia)))));
  }
  const f1 = resumen(`Fase 1 · ${RONDAS} rondas de ${CONEXIONES} peticiones simultáneas`, rondas, (performance.now() - t0) / 1000);

  t0 = performance.now();
  const limite = Date.now() + DURACION * 1000;
  const sostenida = [];
  await Promise.all(Array.from({ length: CONEXIONES }, async () => {
    while (Date.now() < limite) sostenida.push(await validar(url, guardia));
  }));
  const f2 = resumen(`Fase 2 · ${CONEXIONES} clientes sin pausa durante ${DURACION} s`, sostenida, (performance.now() - t0) / 1000);

  await pedir("DELETE", `/visitas/${visita.id}`, residente).catch(() => {});
  const cumple = f1.p99 < LIMITE_MS && f2.p99 < LIMITE_MS && f1.errores === 0 && f2.errores === 0;
  console.log(`RNF04 (p99 < ${LIMITE_MS} ms y sin errores en ambas fases): ${cumple ? "CUMPLE" : "NO CUMPLE"}`);
  process.exit(cumple ? 0 : 1);
})().catch((e) => { console.error(e.message); process.exit(1); });
