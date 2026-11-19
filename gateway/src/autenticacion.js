// Verificación del token en el API Gateway (Entrega 6, RNF02).
//
// Orden de las revisiones (de la más barata a la más cara, Entrega 3):
//   1. ¿La ruta es pública? (POST /sesiones y GET /health) -> pasa sin token.
//   2. ¿Viene "Authorization: Bearer <token>"?              -> si no, 401 TOKEN_INVALIDO.
//   3. ¿La firma es válida y el token no expiró?            -> 401 TOKEN_INVALIDO o TOKEN_EXPIRADO.
//   4. ¿El token fue revocado o la cuenta se desactivó?     -> consulta I01 en Identidad; 401 si sí.
// Si todo está bien, el gateway reenvía la identidad al servicio en encabezados propios.
const jwt = require("jsonwebtoken");
const { ErrorApi, llamarServicio } = require("@caseta/shared");

const RUTAS_PUBLICAS = [
  { metodo: "POST", ruta: "/api/v1/sesiones" },
  { metodo: "GET", ruta: "/api/v1/health" },
];

// Encabezados de identidad: el cliente nunca puede enviarlos por su cuenta.
const ENCABEZADOS_IDENTIDAD = ["x-usuario-id", "x-usuario-rol", "x-sesion-jti", "x-sesion-expira", "x-clave-servicio"];

const esPublica = (req) => {
  const ruta = req.path.replace(/\/+$/, "") || "/";
  return RUTAS_PUBLICAS.some((p) => p.metodo === req.method && p.ruta === ruta);
};

function limpiarEncabezados(req) {
  for (const h of ENCABEZADOS_IDENTIDAD) delete req.headers[h];
  // Solo el gateway conoce la clave de servicio; con ella los servicios saben que la petición pasó por aquí.
  req.headers["x-clave-servicio"] = process.env.CLAVE_SERVICIO || "";
}

const noValido = (mensaje = "Tu sesión no es válida o expiró. Inicia sesión de nuevo.") =>
  new ErrorApi(401, "TOKEN_INVALIDO", mensaje);

async function verificarToken(req, res, next) {
  limpiarEncabezados(req);
  if (req.method === "OPTIONS" || esPublica(req)) return next();

  // El esquema no distingue mayúsculas (RFC 6750); antes "bearer" se rechazaba (defecto D02).
  const [esquema, token] = (req.headers.authorization || "").trim().split(/\s+/);
  if (!esquema || esquema.toLowerCase() !== "bearer" || !token) {
    return next(noValido("Falta el token. Envía el encabezado Authorization: Bearer <token>."));
  }

  let datos;
  try {
    datos = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"], issuer: "caseta" });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new ErrorApi(401, "TOKEN_EXPIRADO", "Tu sesión expiró después de 8 horas. Inicia sesión de nuevo."));
    }
    return next(noValido());
  }
  if (!datos.sub || !datos.rol || !datos.jti) return next(noValido());

  // I01: Identidad responde 200 si el token fue revocado o la cuenta ya no está activa; 404 si sigue vigente.
  try {
    const url = `${process.env.URL_IDENTIDAD || "http://localhost:3001"}/internal/v1/tokens-revocados/${encodeURIComponent(datos.jti)}?usuarioId=${encodeURIComponent(datos.sub)}`;
    const { estado, cuerpo } = await llamarServicio("Identidad", url, { idSolicitud: req.headers["x-request-id"] });
    if (estado === 200) {
      return next(noValido(cuerpo && cuerpo.motivo === "cuenta_desactivada"
        ? "Tu cuenta fue desactivada. Comunícate con la administración."
        : "Tu sesión fue cerrada. Inicia sesión de nuevo."));
    }
    if (estado !== 404) throw new ErrorApi(503, "SERVICIO_NO_DISPONIBLE", "No fue posible verificar tu sesión. Inténtalo en unos momentos.");
  } catch (err) {
    return next(err);
  }

  req.headers["x-usuario-id"] = String(datos.sub);
  req.headers["x-usuario-rol"] = datos.rol;
  req.headers["x-sesion-jti"] = datos.jti;
  req.headers["x-sesion-expira"] = String(datos.exp);
  next();
}

module.exports = { verificarToken };
