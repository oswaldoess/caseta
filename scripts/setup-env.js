// Copia cada .env.example a .env si todavía no existe.
const fs = require("fs");
const path = require("path");
const carpetas = ["gateway", ...fs.readdirSync(path.join(__dirname, "..", "services")).map((s) => path.join("services", s))];
for (const c of carpetas) {
  const ejemplo = path.join(__dirname, "..", c, ".env.example");
  const destino = path.join(__dirname, "..", c, ".env");
  if (fs.existsSync(ejemplo) && !fs.existsSync(destino)) {
    fs.copyFileSync(ejemplo, destino);
    console.log(`Creado ${path.join(c, ".env")}`);
  }
}
