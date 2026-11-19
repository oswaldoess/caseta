// Antes de las pruebas de integración: si el sistema no está corriendo, levanta el gateway y los cinco servicios.
// Requisitos: la base caseta creada (npm run db:crear) y los archivos .env (npm run setup:env).
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

const RAIZ = path.join(__dirname, "..", "..");
const CARPETAS = ["gateway", "services/identidad", "services/viviendas", "services/visitas", "services/accesos", "services/reglas"];
const URL_SALUD = "http://localhost:3000/api/v1/health";

async function sistemaListo() {
  try {
    const r = await fetch(URL_SALUD, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch {
    return false;
  }
}

module.exports = async function preparar() {
  if (await sistemaListo()) return; // ya estaba levantado (por ejemplo con npm run dev)
  const registro = fs.openSync(path.join(os.tmpdir(), "caseta-pruebas.log"), "a");
  globalThis.__procesosCaseta = CARPETAS.map((c) =>
    spawn(process.execPath, ["src/index.js"], { cwd: path.join(RAIZ, c), stdio: ["ignore", registro, registro] }));
  for (let i = 0; i < 60; i++) {
    if (await sistemaListo()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`El sistema no respondió en ${URL_SALUD}. Revisa que MySQL esté encendido y la base creada (npm run db:crear). Registro: ${path.join(os.tmpdir(), "caseta-pruebas.log")}`);
};
