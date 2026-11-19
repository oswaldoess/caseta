const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { rutaNoEncontrada, manejadorErrores, cuerpoError, fechaLocal } = require("@caseta/shared");
const rutas = require("./rutas");
const { verificarToken } = require("./autenticacion");

const app = express();
app.use(helmet());
// CORS: solo los orígenes de CORS_ORIGEN (separados por coma) reciben los encabezados de CORS.
// Un origen que no está en la lista no recibe Access-Control-Allow-Origin y el navegador bloquea la respuesta.
const origenes = (process.env.CORS_ORIGEN || "http://localhost:5173").split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origen, listo) => listo(null, !origen || origenes.includes(origen) ? origen || false : false),
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
  exposedHeaders: ["Location", "X-Request-Id"],
  maxAge: 600,
}));

// Documentación interactiva de la API (Swagger UI) generada desde docs/api/openapi.yaml. Es pública.
app.use("/api/docs", require("./documentacion"));

// Cada petición recibe un identificador que viaja a los servicios (X-Request-Id).
// Solo se acepta el que manda el cliente si es seguro para los registros (defecto D03).
const ID_VALIDO = /^[A-Za-z0-9_-]{1,64}$/;
app.use((req, res, next) => {
  const recibido = req.headers["x-request-id"];
  req.headers["x-request-id"] = recibido && ID_VALIDO.test(recibido) ? recibido : "req_" + crypto.randomBytes(4).toString("hex");
  res.setHeader("X-Request-Id", req.headers["x-request-id"]);
  next();
});

// Estado del sistema: consulta /health de cada servicio con tiempo límite de 3 segundos (RNF07).
app.get("/api/v1/health", async (req, res) => {
  const servicios = {};
  await Promise.all(rutas().map(async ({ servicio, url }) => {
    try {
      const r = await fetch(url + "/health", { signal: AbortSignal.timeout(3000) });
      servicios[servicio] = r.ok ? "ok" : "sin_respuesta";
    } catch {
      servicios[servicio] = "sin_respuesta";
    }
  }));
  const todoBien = Object.values(servicios).every((e) => e === "ok");
  res.status(todoBien ? 200 : 503).json({ estado: todoBien ? "ok" : "degradado", version: require("../package.json").version, fecha: fechaLocal(), servicios });
});

// Verificación del token JWT y de su revocación (Entrega 6). Deja pasar solo las rutas públicas.
app.use(verificarToken);

// Reenvío de cada prefijo a su servicio. Si el servicio no responde, se devuelve 503.
for (const { url, prefijos } of rutas()) {
  app.use(createProxyMiddleware({
    target: url,
    pathFilter: prefijos,
    proxyTimeout: 3000,
    xfwd: true, // agrega X-Forwarded-For para que Identidad limite los intentos de inicio de sesión por IP
    on: {
      error: (err, req, res) => {
        if (!res.headersSent) {
          res.writeHead(503, { "Content-Type": "application/json" });
        }
        res.end(JSON.stringify(cuerpoError(req, 503, "SERVICIO_NO_DISPONIBLE", "El servicio no está disponible en este momento. Inténtalo en unos momentos.")));
      },
    },
  }));
}

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
