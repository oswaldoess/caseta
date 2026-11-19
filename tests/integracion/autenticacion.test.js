// Autenticación: inicio y cierre de sesión, token inválido, vencido, revocado y límite de intentos.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const { api, auth, iniciarSesion, esperarError, CUENTAS } = require("./utilidades");

// El secreto real del gateway, para firmar un token vencido igual que lo haría Identidad.
const secreto = dotenv.parse(fs.readFileSync(path.join(__dirname, "..", "..", "gateway", ".env"))).JWT_SECRET;

describe("E01 Iniciar sesión", () => {
  test("devuelve un token Bearer de 8 horas y nunca la contraseña", async () => {
    const r = await api().post("/api/v1/sesiones").send({ correo: CUENTAS.guardia, contrasena: "Caseta2026!" });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ tipo: "Bearer", expiraEn: 28800, usuario: { rol: "guardia" } });
    expect(JSON.stringify(r.body)).not.toMatch(/contrasena|\$2[aby]\$/);
    const datos = jwt.decode(r.body.token);
    expect(datos.exp - datos.iat).toBe(28800);
  });

  test("contraseña incorrecta y cuenta desactivada responden igual (401)", async () => {
    const a = await api().post("/api/v1/sesiones").send({ correo: CUENTAS.residente, contrasena: "NoEsMiClave1" });
    const b = await api().post("/api/v1/sesiones").send({ correo: "jorge.medina@correo.com", contrasena: "Caseta2026!" });
    expect(esperarError(a, 401, "CREDENCIALES_INVALIDAS").mensaje).toBe(esperarError(b, 401, "CREDENCIALES_INVALIDAS").mensaje);
  });

  test("datos inválidos responden 400 con cada campo", async () => {
    const r = await api().post("/api/v1/sesiones").send({ correo: "no-es-correo" });
    const e = esperarError(r, 400, "VALIDACION_FALLIDA");
    expect(e.detalles.map((d) => d.campo)).toEqual(expect.arrayContaining(["correo", "contrasena"]));
  });

  test("el sexto intento fallido en un minuto responde 429", async () => {
    const correo = `intruso.${Date.now()}@correo.com`;
    const estados = [];
    for (let i = 0; i < 6; i++) {
      estados.push((await api().post("/api/v1/sesiones").send({ correo, contrasena: "Adivinar123" })).status);
    }
    expect(estados).toEqual([401, 401, 401, 401, 401, 429]);
  });
});

describe("Token en las rutas protegidas", () => {
  test("sin token, token falso, token vencido y token de otro secreto responden 401", async () => {
    const firmar = (s, opc) => jwt.sign({ rol: "administrador" }, s, { subject: "1", jwtid: crypto.randomUUID(), issuer: "caseta", ...opc });
    esperarError(await api().get("/api/v1/usuarios"), 401, "TOKEN_INVALIDO");
    esperarError(await api().get("/api/v1/usuarios").set(auth("abc.def.ghi")), 401, "TOKEN_INVALIDO");
    esperarError(await api().get("/api/v1/usuarios").set(auth(firmar(secreto, { expiresIn: -60 }))), 401, "TOKEN_EXPIRADO");
    esperarError(await api().get("/api/v1/usuarios").set(auth(firmar("otro-secreto", { expiresIn: 60 }))), 401, "TOKEN_INVALIDO");
  });

  test("E02 cerrar sesión invalida el token de inmediato", async () => {
    const token = await iniciarSesion("sandra.aguilar@correo.com");
    expect((await api().get("/api/v1/usuarios/me").set(auth(token))).status).toBe(200);
    expect((await api().delete("/api/v1/sesiones/actual").set(auth(token))).status).toBe(204);
    const e = esperarError(await api().get("/api/v1/usuarios/me").set(auth(token)), 401, "TOKEN_INVALIDO");
    expect(e.mensaje).toContain("cerrada");
  });

  test("una cuenta desactivada pierde sus sesiones abiertas", async () => {
    const admin = await iniciarSesion(CUENTAS.administrador);
    const token = await iniciarSesion("luis.campos@correo.com");
    await api().patch("/api/v1/usuarios/9").set(auth(admin)).send({ activo: false }).expect(200);
    try {
      esperarError(await api().get("/api/v1/usuarios/me").set(auth(token)), 401, "TOKEN_INVALIDO");
    } finally {
      await api().patch("/api/v1/usuarios/9").set(auth(admin)).send({ activo: true }).expect(200);
    }
  });

  test("E04 cambiar la contraseña exige la actual", async () => {
    const token = await iniciarSesion("ricardo.nunez@correo.com");
    esperarError(await api().put("/api/v1/usuarios/me/contrasena").set(auth(token))
      .send({ contrasenaActual: "NoEsMiClave1", contrasenaNueva: "NuevaClave#2026" }), 400, "CONTRASENA_ACTUAL_INCORRECTA");
    await api().put("/api/v1/usuarios/me/contrasena").set(auth(token))
      .send({ contrasenaActual: "Caseta2026!", contrasenaNueva: "NuevaClave#2026" }).expect(204);
    const nuevo = await iniciarSesion("ricardo.nunez@correo.com", "NuevaClave#2026");
    await api().put("/api/v1/usuarios/me/contrasena").set(auth(nuevo))
      .send({ contrasenaActual: "NuevaClave#2026", contrasenaNueva: "Caseta2026!" }).expect(204);
  });

  test("llamar directo a un servicio, sin pasar por el gateway, responde 401", async () => {
    const r = await fetch("http://localhost:3001/api/v1/usuarios", { headers: { "X-Usuario-Id": "1", "X-Usuario-Rol": "administrador" } });
    expect(r.status).toBe(401);
  });

  test("el gateway no expone detalles del servidor", async () => {
    const r = await api().get("/api/v1/health");
    expect(r.headers["x-powered-by"]).toBeUndefined();
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("CORS", () => {
  test("un origen permitido recibe Access-Control-Allow-Origin", async () => {
    const r = await api().options("/api/v1/visitas").set("Origin", "http://localhost:5173").set("Access-Control-Request-Method", "POST");
    expect(r.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  test("un origen que no está en la lista no lo recibe", async () => {
    const r = await api().get("/api/v1/health").set("Origin", "http://sitio-ajeno.com");
    expect(r.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
