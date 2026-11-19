// Autorización en los servicios (Entrega 6).
//
// El API Gateway verifica el token JWT (firma, vigencia y revocación) y reenvía la identidad
// del usuario en encabezados X-Usuario-Id y X-Usuario-Rol, junto con X-Clave-Servicio.
// Los servicios no vuelven a leer el token, pero sí deciden qué puede hacer cada rol:
// la regla de permisos vive en el servidor, nunca solo en el cliente.
const crypto = require("crypto");
const { ErrorApi } = require("./errores");

const ROLES = ["residente", "guardia", "administrador"];

function claveValida(req) {
  const esperada = Buffer.from(process.env.CLAVE_SERVICIO || "");
  const recibida = Buffer.from(req.headers["x-clave-servicio"] || "");
  return esperada.length > 0 && esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}

// Toda petición pública debe llegar por el gateway: sin la clave de servicio se rechaza.
// Así nadie puede saltarse la verificación del token llamando directo al puerto del servicio.
function soloDesdeGateway(req, res, next) {
  if (!claveValida(req)) {
    return next(new ErrorApi(401, "TOKEN_INVALIDO", "La petición debe hacerse a través del API Gateway."));
  }
  const id = Number(req.headers["x-usuario-id"]);
  const rol = req.headers["x-usuario-rol"];
  if (Number.isInteger(id) && id > 0 && ROLES.includes(rol)) {
    req.usuario = {
      id,
      rol,
      jti: req.headers["x-sesion-jti"] || null,
      expira: Number(req.headers["x-sesion-expira"]) || null,
    };
  }
  next();
}

// Exige sesión iniciada y uno de los roles indicados. Sin roles: cualquier rol con sesión.
function permitir(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return next(new ErrorApi(401, "TOKEN_INVALIDO", "Tu sesión no es válida o expiró. Inicia sesión de nuevo."));
    }
    if (roles.length && !roles.includes(req.usuario.rol)) {
      return next(new ErrorApi(403, "SIN_PERMISO", "Tu rol no tiene permiso para realizar esta operación."));
    }
    next();
  };
}

const sinPermiso = (mensaje = "Tu rol no tiene permiso para realizar esta operación.") =>
  new ErrorApi(403, "SIN_PERMISO", mensaje);

module.exports = { soloDesdeGateway, permitir, sinPermiso, ROLES };
