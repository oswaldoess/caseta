// Prepara los archivos .env de cada carpeta a partir de su .env.example.
// - Si el .env no existe, lo copia completo.
// - Si ya existe, solo le agrega las variables nuevas que falten, sin cambiar las que ya tienes
//   (por ejemplo, un DB_PORT=3307 o una contraseña propia se conservan).
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const carpetas = ["gateway", ...fs.readdirSync(path.join(raiz, "services")).map((s) => path.join("services", s))];
const clave = (linea) => (/^\s*([A-Z0-9_]+)\s*=/.exec(linea) || [])[1];

for (const c of carpetas) {
  const ejemplo = path.join(raiz, c, ".env.example");
  const destino = path.join(raiz, c, ".env");
  if (!fs.existsSync(ejemplo)) continue;
  if (!fs.existsSync(destino)) {
    fs.copyFileSync(ejemplo, destino);
    console.log(`Creado ${path.join(c, ".env")}`);
    continue;
  }
  const actual = fs.readFileSync(destino, "utf8");
  const existentes = new Set(actual.split(/\r?\n/).map(clave).filter(Boolean));
  const faltantes = fs.readFileSync(ejemplo, "utf8").split(/\r?\n/).filter((l) => clave(l) && !existentes.has(clave(l)));
  if (faltantes.length) {
    const separador = actual.endsWith("\n") ? "" : "\n";
    fs.appendFileSync(destino, `${separador}\n# Agregadas por npm run setup:env\n${faltantes.join("\n")}\n`);
    console.log(`Actualizado ${path.join(c, ".env")}: ${faltantes.map(clave).join(", ")}`);
  }
}
