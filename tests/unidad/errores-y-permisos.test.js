// Formato estándar de errores y middlewares de permisos (shared), probados con una app mínima de Express.
const express = require("express");
const request = require("supertest");
const { ErrorApi, manejadorErrores, rutaNoEncontrada, soloDesdeGateway, permitir } = require("@caseta/shared");

process.env.CLAVE_SERVICIO = "clave_de_prueba";
const CLAVE = { "X-Clave-Servicio": "clave_de_prueba" };

function crearApp() {
  const app = express();
  app.use(express.json({ limit: "1kb" }));
  app.use("/api", soloDesdeGateway);
  app.get("/api/admin", permitir("administrador"), (req, res) => res.json({ ok: true, usuario: req.usuario }));
  app.get("/api/cualquiera", permitir(), (req, res) => res.json({ ok: true }));
  app.post("/api/eco", (req, res) => res.json(req.body));
  app.get("/api/regla", () => { throw new ErrorApi(422, "LIMITE_PERSONAS_EXCEDIDO", "Mensaje para la persona.", [{ campo: "x", mensaje: "y" }]); });
  app.get("/api/falla", () => { throw new Error("ER_ACCESS_DENIED: SELECT * FROM usuarios"); });
  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}
const app = crearApp();
const CAMPOS = ["codigo", "mensaje", "estado", "detalles", "ruta", "fecha", "idSolicitud"];

describe("Formato estándar de errores", () => {
  beforeAll(() => jest.spyOn(console, "error").mockImplementation(() => {}));

  test("un ErrorApi conserva su estado, código y detalles", async () => {
    const r = await request(app).get("/api/regla").set(CLAVE);
    expect(r.status).toBe(422);
    expect(Object.keys(r.body.error)).toEqual(CAMPOS);
    expect(r.body.error).toMatchObject({ codigo: "LIMITE_PERSONAS_EXCEDIDO", estado: 422, detalles: [{ campo: "x", mensaje: "y" }] });
  });

  test("un error inesperado responde 500 genérico y no revela el detalle interno", async () => {
    const r = await request(app).get("/api/falla").set(CLAVE);
    expect(r.status).toBe(500);
    expect(r.body.error.codigo).toBe("ERROR_INTERNO");
    expect(JSON.stringify(r.body)).not.toMatch(/SELECT|ER_ACCESS|usuarios/);
  });

  test("JSON mal formado responde 400", async () => {
    const r = await request(app).post("/api/eco").set(CLAVE).set("Content-Type", "application/json").send('{"a": ');
    expect(r.status).toBe(400);
    expect(r.body.error.codigo).toBe("VALIDACION_FALLIDA");
  });

  test("un cuerpo demasiado grande responde 413, no 500 (defecto D01)", async () => {
    const r = await request(app).post("/api/eco").set(CLAVE).send({ texto: "x".repeat(5000) });
    expect(r.status).toBe(413);
    expect(r.body.error.codigo).toBe("VALIDACION_FALLIDA");
  });

  test("una ruta inexistente responde 404 con el mismo formato", async () => {
    const r = await request(app).get("/no-existe");
    expect(r.status).toBe(404);
    expect(Object.keys(r.body.error)).toEqual(CAMPOS);
  });
});

describe("Permisos en los servicios", () => {
  const como = (rol) => ({ ...CLAVE, "X-Usuario-Id": "7", "X-Usuario-Rol": rol });

  test("sin la clave de servicio se rechaza aunque traiga encabezados de identidad", async () => {
    const r = await request(app).get("/api/admin").set({ "X-Usuario-Id": "1", "X-Usuario-Rol": "administrador" });
    expect(r.status).toBe(401);
    expect(r.body.error.mensaje).toContain("API Gateway");
  });

  test("con la clave equivocada también se rechaza", async () => {
    const r = await request(app).get("/api/admin").set({ "X-Clave-Servicio": "otra", "X-Usuario-Id": "1", "X-Usuario-Rol": "administrador" });
    expect(r.status).toBe(401);
  });

  test("sin usuario identificado responde 401", async () => {
    expect((await request(app).get("/api/cualquiera").set(CLAVE)).status).toBe(401);
  });

  test.each([["residente", 403], ["guardia", 403], ["administrador", 200]])("rol %s en una ruta de administración -> %i", async (rol, estado) => {
    expect((await request(app).get("/api/admin").set(como(rol))).status).toBe(estado);
  });

  test("un rol inventado no cuenta como sesión", async () => {
    expect((await request(app).get("/api/cualquiera").set(como("superusuario"))).status).toBe(401);
  });
});
