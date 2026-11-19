// Verificación del token en el gateway: firma, vigencia, algoritmo, revocación y encabezados falsos.
jest.mock("@caseta/shared", () => {
  const real = jest.requireActual("@caseta/shared");
  return { ...real, llamarServicio: jest.fn() };
});
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { llamarServicio } = require("@caseta/shared");
const { verificarToken } = require("../../gateway/src/autenticacion");

process.env.JWT_SECRET = "secreto_de_prueba_con_mas_de_32_caracteres";
process.env.CLAVE_SERVICIO = "clave_de_prueba";

const firmar = (opciones = {}, secreto = process.env.JWT_SECRET) =>
  jwt.sign({ rol: "residente" }, secreto, { subject: "5", jwtid: crypto.randomUUID(), issuer: "caseta", expiresIn: 3600, ...opciones });

// Ejecuta el middleware con una petición simulada y devuelve el error (o null) y los encabezados resultantes.
function correr({ metodo = "GET", ruta = "/api/v1/visitas", headers = {} } = {}) {
  const req = { method: metodo, path: ruta, headers: { "x-request-id": "req_prueba", ...headers } };
  return new Promise((resolve) => verificarToken(req, {}, (err) => resolve({ err: err || null, req })));
}

beforeEach(() => llamarServicio.mockReset().mockResolvedValue({ estado: 404, cuerpo: { revocado: false } }));

describe("Verificación del token en el gateway", () => {
  test("las rutas públicas pasan sin token", async () => {
    expect((await correr({ metodo: "POST", ruta: "/api/v1/sesiones" })).err).toBeNull();
    expect((await correr({ ruta: "/api/v1/health" })).err).toBeNull();
  });

  test("sin token responde 401 TOKEN_INVALIDO", async () => {
    const { err } = await correr();
    expect(err).toMatchObject({ estado: 401, codigo: "TOKEN_INVALIDO" });
  });

  test("un token válido pasa y el gateway agrega la identidad", async () => {
    const { err, req } = await correr({ headers: { authorization: `Bearer ${firmar()}` } });
    expect(err).toBeNull();
    expect(req.headers["x-usuario-id"]).toBe("5");
    expect(req.headers["x-usuario-rol"]).toBe("residente");
    expect(req.headers["x-clave-servicio"]).toBe("clave_de_prueba");
  });

  test("el esquema Bearer no distingue mayúsculas (defecto D02)", async () => {
    expect((await correr({ headers: { authorization: `bearer ${firmar()}` } })).err).toBeNull();
  });

  test("un token expirado responde TOKEN_EXPIRADO", async () => {
    const { err } = await correr({ headers: { authorization: `Bearer ${firmar({ expiresIn: -10 })}` } });
    expect(err).toMatchObject({ estado: 401, codigo: "TOKEN_EXPIRADO" });
  });

  test("un token firmado con otro secreto se rechaza", async () => {
    const { err } = await correr({ headers: { authorization: `Bearer ${firmar({}, "otro_secreto")}` } });
    expect(err).toMatchObject({ estado: 401, codigo: "TOKEN_INVALIDO" });
  });

  test("un token sin firma (alg none) se rechaza", async () => {
    const sinFirma = jwt.sign({ rol: "administrador", sub: "1", jti: crypto.randomUUID(), iss: "caseta" }, null, { algorithm: "none" });
    const { err } = await correr({ headers: { authorization: `Bearer ${sinFirma}` } });
    expect(err).toMatchObject({ estado: 401, codigo: "TOKEN_INVALIDO" });
  });

  test("un token revocado (I01 responde 200) se rechaza", async () => {
    llamarServicio.mockResolvedValue({ estado: 200, cuerpo: { revocado: true, motivo: "sesion_cerrada" } });
    const { err } = await correr({ headers: { authorization: `Bearer ${firmar()}` } });
    expect(err.estado).toBe(401);
    expect(err.message).toContain("cerrada");
  });

  test("si Identidad no puede verificar el token responde 503", async () => {
    llamarServicio.mockResolvedValue({ estado: 500, cuerpo: null });
    const { err } = await correr({ headers: { authorization: `Bearer ${firmar()}` } });
    expect(err).toMatchObject({ estado: 503, codigo: "SERVICIO_NO_DISPONIBLE" });
  });

  test("los encabezados de identidad que manda el cliente se borran", async () => {
    const { req } = await correr({
      metodo: "POST", ruta: "/api/v1/sesiones",
      headers: { "x-usuario-id": "1", "x-usuario-rol": "administrador", "x-clave-servicio": "inventada" },
    });
    expect(req.headers["x-usuario-id"]).toBeUndefined();
    expect(req.headers["x-usuario-rol"]).toBeUndefined();
    expect(req.headers["x-clave-servicio"]).toBe("clave_de_prueba");
  });
});
