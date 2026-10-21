const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { rutaNoEncontrada, manejadorErrores, cuerpoError } = require("@caseta/shared");
const rutas = require("./rutas");

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGEN || "http://localhost:5173" }));

// Cada petición recibe un identificador que viaja a los servicios (X-Request-Id).
app.use((req, res, next) => {
  req.headers["x-request-id"] = req.headers["x-request-id"] || "req_" + crypto.randomBytes(4).toString("hex");
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
  res.status(todoBien ? 200 : 503).json({ estado: todoBien ? "ok" : "degradado", version: "1.0.0", fecha: new Date().toISOString(), servicios });
});

// Aquí se agregará la verificación del token y de su revocación (Entrega 6).

// Reenvío de cada prefijo a su servicio. Si el servicio no responde, se devuelve 503.
for (const { url, prefijos } of rutas()) {
  app.use(createProxyMiddleware({
    target: url,
    pathFilter: prefijos,
    proxyTimeout: 3000,
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
