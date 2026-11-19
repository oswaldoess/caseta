// Swagger UI en /api/docs y la especificación en /api/docs/openapi.json (Entrega 7).
const fs = require("fs");
const path = require("path");
const { Router } = require("express");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yaml");

const especificacion = YAML.parse(fs.readFileSync(path.join(__dirname, "..", "..", "docs", "api", "openapi.yaml"), "utf8"));

const router = Router();
// Swagger UI necesita estilos y scripts en línea; se relaja la política solo en esta ruta.
router.use(helmet.contentSecurityPolicy({
  directives: { "script-src": ["'self'", "'unsafe-inline'"], "style-src": ["'self'", "'unsafe-inline'"], "img-src": ["'self'", "data:"] },
}));
router.get("/openapi.json", (req, res) => res.json(especificacion));
router.use("/", swaggerUi.serve, swaggerUi.setup(especificacion, {
  customSiteTitle: "Caseta API",
  swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
}));

module.exports = router;
