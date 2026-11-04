// Crea (o reinicia) la base `caseta` desde cero con Node, sin necesitar el cliente `mysql` en la terminal.
// Ejecuta en orden: 01_esquema.sql, 02_datos_prueba.sql y 04_usuarios_servicios.sql.
//
// Uso:  npm run db:crear
// Pide la contraseña del usuario administrador de MySQL (root por defecto).
// También se pueden usar variables: MYSQL_ADMIN_USER, MYSQL_ADMIN_PASSWORD, DB_HOST, DB_PORT.
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const mysql = require("mysql2/promise");

const SCRIPTS = ["01_esquema.sql", "02_datos_prueba.sql", "04_usuarios_servicios.sql"];

function preguntarOculto(pregunta) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let mostrada = false;
    rl._writeToOutput = (texto) => {
      if (!mostrada) { process.stdout.write(texto); mostrada = true; }
    };
    rl.question(pregunta, (respuesta) => {
      rl.close();
      process.stdout.write("\n");
      resolve(respuesta);
    });
  });
}

async function main() {
  const usuario = process.env.MYSQL_ADMIN_USER || "root";
  const contrasena = process.env.MYSQL_ADMIN_PASSWORD !== undefined
    ? process.env.MYSQL_ADMIN_PASSWORD
    : await preguntarOculto(`Contraseña de MySQL para ${usuario}: `);

  const conexion = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: usuario,
    password: contrasena,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  try {
    // Las fechas por defecto (CURRENT_TIMESTAMP) quedan en hora de la Ciudad de México.
    await conexion.query("SET time_zone = '-06:00'");
    for (const archivo of SCRIPTS) {
      const sql = fs.readFileSync(path.join(__dirname, "..", "database", archivo), "utf8");
      await conexion.query(sql);
      console.log(`✔ ${archivo}`);
    }
    const [[{ total }]] = await conexion.query("SELECT COUNT(*) AS total FROM caseta.usuarios");
    console.log(`Base caseta lista: ${total} usuarios de prueba (contraseña de prueba Caseta2026!).`);
  } finally {
    await conexion.end();
  }
}

main().catch((err) => {
  console.error("No se pudo crear la base:", err.message);
  process.exit(1);
});
