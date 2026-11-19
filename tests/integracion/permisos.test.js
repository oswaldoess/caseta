// Autorización: cada rol solo puede usar sus endpoints (tabla de roles de la Entrega 3).
const { api, auth, tokensDePrueba, esperarError } = require("./utilidades");

let t;
beforeAll(async () => { t = await tokensDePrueba(); });

// [rol, método, ruta, cuerpo]: todas deben responder 403 SIN_PERMISO.
const PROHIBIDAS = [
  ["residente", "get", "/api/v1/usuarios", null],
  ["guardia", "get", "/api/v1/usuarios", null],
  ["residente", "post", "/api/v1/usuarios", {}],
  ["guardia", "patch", "/api/v1/usuarios/5", { activo: false }],
  ["residente", "get", "/api/v1/viviendas", null],
  ["guardia", "get", "/api/v1/viviendas/1", null],
  ["residente", "post", "/api/v1/viviendas", {}],
  ["residente", "post", "/api/v1/viviendas/1/residentes", { usuarioId: 6 }],
  ["guardia", "post", "/api/v1/visitas", {}],
  ["administrador", "post", "/api/v1/visitas", {}],
  ["guardia", "get", "/api/v1/visitas/1", null],
  ["administrador", "patch", "/api/v1/visitas/1", { numeroPersonas: 2 }],
  ["administrador", "delete", "/api/v1/visitas/1", null],
  ["residente", "get", "/api/v1/codigos/K7P4M2QX/validez", null],
  ["administrador", "get", "/api/v1/codigos/K7P4M2QX/validez", null],
  ["residente", "post", "/api/v1/accesos", { codigo: "K7P4M2QX" }],
  ["administrador", "post", "/api/v1/accesos", { codigo: "K7P4M2QX" }],
  ["residente", "post", "/api/v1/accesos/1/salida", {}],
  ["residente", "patch", "/api/v1/accesos/1", { observaciones: "x" }],
  ["residente", "post", "/api/v1/adeudos", { viviendaId: 1, concepto: "Cuota", periodo: "2026-11", monto: 950 }],
  ["guardia", "get", "/api/v1/adeudos", null],
  ["residente", "patch", "/api/v1/adeudos/3", { estado: "liquidado" }],
  ["guardia", "get", "/api/v1/parametros", null],
  ["residente", "put", "/api/v1/parametros/tolerancia_minutos", { valor: 60 }],
];

describe("Un rol sin permiso no puede ejecutar operaciones protegidas", () => {
  test.each(PROHIBIDAS)("%s %s %s -> 403", async (rol, metodo, ruta, cuerpo) => {
    let peticion = api()[metodo](ruta).set(auth(t[rol]));
    if (cuerpo) peticion = peticion.send(cuerpo);
    esperarError(await peticion, 403, "SIN_PERMISO");
  });
});

describe("Cada rol solo ve sus datos", () => {
  test("el residente ve su vivienda, pero la de otro responde 404", async () => {
    expect((await api().get("/api/v1/viviendas/1").set(auth(t.residente))).status).toBe(200);
    esperarError(await api().get("/api/v1/viviendas/2").set(auth(t.residente)), 404, "RECURSO_NO_ENCONTRADO");
  });

  test("el residente solo lista visitas de su vivienda, aunque intente filtrar otra", async () => {
    const r = await api().get("/api/v1/visitas?limite=100").set(auth(t.residente));
    expect(r.status).toBe(200);
    r.body.datos.forEach((v) => expect(v.viviendaId).toBe(1));
    esperarError(await api().get("/api/v1/visitas?viviendaId=2").set(auth(t.residente)), 403, "SIN_PERMISO");
  });

  test("el residente solo ve el historial de su vivienda", async () => {
    const r = await api().get("/api/v1/accesos?limite=100").set(auth(t.residente2));
    expect(r.status).toBe(200);
    r.body.datos.forEach((a) => expect(a.viviendaId).toBe(3));
    esperarError(await api().get("/api/v1/accesos/2").set(auth(t.residente2)), 404, "RECURSO_NO_ENCONTRADO");
  });

  test("el guardia solo consulta lo de hoy", async () => {
    esperarError(await api().get("/api/v1/visitas?validaEn=2030-01-01").set(auth(t.guardia)), 403, "SIN_PERMISO");
    esperarError(await api().get("/api/v1/accesos?desde=2026-10-01").set(auth(t.guardia)), 403, "SIN_PERMISO");
  });

  test("todos los roles pueden ver su perfil", async () => {
    for (const rol of Object.keys(t)) {
      const r = await api().get("/api/v1/usuarios/me").set(auth(t[rol]));
      expect(r.status).toBe(200);
      expect(r.body.rol).toBe(rol.replace(/2$/, ""));
    }
  });
});
