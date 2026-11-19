// Conexión a MySQL compartida por los servicios (Entrega 5; transacciones en la Entrega 6).
// Cada servicio usa su propio usuario de MySQL (DB_USER en su .env), con permisos
// solo sobre sus tablas (database/04_usuarios_servicios.sql).
const mysql = require("mysql2/promise");

let pool = null;

function obtenerPool() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || "caseta",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: Number(process.env.DB_CONEXIONES) || 10,
    waitForConnections: true,
    connectTimeout: 3000,
    charset: "utf8mb4",
    // Las fechas se leen como texto ("2026-10-24 18:07:12") para no convertirlas de zona horaria.
    dateStrings: true,
    // DECIMAL(10,2) llega como número y no como texto.
    decimalNumbers: true,
  });
  // Las fechas se guardan en hora de la Ciudad de México (UTC-6, sin horario de verano).
  pool.pool.on("connection", (conexion) => {
    conexion.query("SET time_zone = '-06:00'");
  });
  return pool;
}

// Ejecuta una consulta parametrizada (los valores nunca se concatenan al SQL).
async function consultar(sql, valores = []) {
  const [filas] = await obtenerPool().execute(sql, valores);
  return filas;
}

// Comprueba que la base responde; lo usa /health.
async function verificarBaseDatos() {
  try {
    await obtenerPool().query("SELECT 1");
    return "ok";
  } catch {
    return "sin_conexion";
  }
}

// Ejecuta varias consultas en una sola transacción. Si fn lanza un error, se revierte todo.
// fn recibe { consultar } ligado a la misma conexión.
async function conTransaccion(fn) {
  const conexion = await obtenerPool().getConnection();
  try {
    await conexion.beginTransaction();
    const tx = {
      consultar: async (sql, valores = []) => {
        const [filas] = await conexion.execute(sql, valores);
        return filas;
      },
    };
    const resultado = await fn(tx);
    await conexion.commit();
    return resultado;
  } catch (err) {
    try { await conexion.rollback(); } catch { /* la conexión ya pudo haberse perdido */ }
    throw err;
  } finally {
    conexion.release();
  }
}

async function cerrarPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { obtenerPool, consultar, conTransaccion, verificarBaseDatos, cerrarPool };
