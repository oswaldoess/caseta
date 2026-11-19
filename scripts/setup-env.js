// Prepara los archivos .env de cada carpeta a partir de su .env.example.
// - Si el .env no existe, lo copia completo.
// - Si ya existe, solo le agrega las variables nuevas que falten, sin cambiar las que ya tienes
//   (por ejemplo, un DB_PORT=3307 o una contraseña propia se conservan).
// - JWT_SECRET y CLAVE_SERVICIO no se copian con el valor de ejemplo: se genera un valor aleatorio
//   (el mismo para todas las carpetas) o se reutiliza el que ya tengan tus otros .env (Entrega 7).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const raiz = path.join(__dirname, "..");
const carpetas = ["gateway", ...fs.readdirSync(path.join(raiz, "services")).map((s) => path.join("services", s))];
const clave = (linea) => (/^\s*([A-Z0-9_]+)\s*=/.exec(linea) || [])[1];
const valor = (linea) => linea.slice(linea.indexOf("=") + 1).trim();
const COMPARTIDAS = ["JWT_SECRET", "CLAVE_SERVICIO"];

// Valor de cada secreto compartido: el que ya exista en algún .env o uno nuevo de 48 bytes.
const secretos = {};
for (const c of carpetas) {
  const destino = path.join(raiz, c, ".env");
  if (!fs.existsSync(destino)) continue;
  for (const l of fs.readFileSync(destino, "utf8").split(/\r?\n/)) {
    const k = clave(l);
    if (COMPARTIDAS.includes(k) && !secretos[k] && valor(l)) secretos[k] = valor(l);
  }
}
for (const k of COMPARTIDAS) secretos[k] ||= crypto.randomBytes(48).toString("base64url");
const conSecreto = (l) => (COMPARTIDAS.includes(clave(l)) ? `${clave(l)}=${secretos[clave(l)]}` : l);

for (const c of carpetas) {
  const ejemplo = path.join(raiz, c, ".env.example");
  const destino = path.join(raiz, c, ".env");
  if (!fs.existsSync(ejemplo)) continue;
  const lineas = fs.readFileSync(ejemplo, "utf8").split(/\r?\n/);
  if (!fs.existsSync(destino)) {
    fs.writeFileSync(destino, lineas.map(conSecreto).join("\n"));
    console.log(`Creado ${path.join(c, ".env")}`);
    continue;
  }
  const actual = fs.readFileSync(destino, "utf8");
  const existentes = new Set(actual.split(/\r?\n/).map(clave).filter(Boolean));
  const faltantes = lineas.filter((l) => clave(l) && !existentes.has(clave(l))).map(conSecreto);
  if (faltantes.length) {
    const separador = actual.endsWith("\n") ? "" : "\n";
    fs.appendFileSync(destino, `${separador}\n# Agregadas por npm run setup:env\n${faltantes.join("\n")}\n`);
    console.log(`Actualizado ${path.join(c, ".env")}: ${faltantes.map(clave).join(", ")}`);
  }
}
