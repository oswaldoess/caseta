// Reglas de negocio y validación de entradas: la API no acepta operaciones imposibles.
const { api, auth, tokensDePrueba, visitaUnica, esperarError } = require("./utilidades");

let t;
beforeAll(async () => { t = await tokensDePrueba(); });

describe("RN03. Límite de personas por adeudo", () => {
  test("con adeudo pendiente se rechaza y al liquidarlo se permite", async () => {
    const adeudo = await api().post("/api/v1/adeudos").set(auth(t.administrador))
      .send({ viviendaId: 3, concepto: "Cuota de mantenimiento", periodo: "2026-11", monto: 950 });
    expect(adeudo.status).toBe(201);
    const e = esperarError(await api().post("/api/v1/visitas").set(auth(t.residente2)).send(visitaUnica("Reunión Herrera", 20)), 422, "LIMITE_PERSONAS_EXCEDIDO");
    expect(e.detalles[0].campo).toBe("numeroPersonas");
    await api().patch(`/api/v1/adeudos/${adeudo.body.id}`).set(auth(t.administrador)).send({ estado: "liquidado" }).expect(200);
    esperarError(await api().patch(`/api/v1/adeudos/${adeudo.body.id}`).set(auth(t.administrador)).send({ estado: "liquidado" }), 409, "ADEUDO_YA_LIQUIDADO");
    const v = await api().post("/api/v1/visitas").set(auth(t.residente2)).send(visitaUnica("Reunión Herrera", 20));
    expect(v.status).toBe(201);
    await api().delete(`/api/v1/visitas/${v.body.id}`).set(auth(t.residente2)).expect(204);
  });
});

describe("Validación de entradas", () => {
  test("todos los errores de una visita se devuelven juntos (RN09)", async () => {
    const r = await api().post("/api/v1/visitas").set(auth(t.residente))
      .send(visitaUnica("L", 0, { horaInicio: "23:00", horaFin: "18:00", placas: "con espacios" }));
    const e = esperarError(r, 400, "VALIDACION_FALLIDA");
    expect(e.detalles.map((d) => d.campo)).toEqual(expect.arrayContaining(["nombreVisitante", "numeroPersonas", "horaFin", "placas"]));
  });

  test.each([
    ["fecha a más de 30 días", { fecha: "2030-01-01" }, "fecha"],
    ["fecha imposible", { fecha: "2026-02-30" }, "fecha"],
    ["hora con formato inválido", { horaInicio: "25:00" }, "horaInicio"],
    ["personas como texto", { numeroPersonas: "6" }, "numeroPersonas"],
    ["más de 20 personas", { numeroPersonas: 21 }, "numeroPersonas"],
  ])("visita con %s -> 400", async (_, cambios, campo) => {
    const e = esperarError(await api().post("/api/v1/visitas").set(auth(t.residente)).send(visitaUnica("Laura Méndez Ríos", 2, cambios)), 400, "VALIDACION_FALLIDA");
    expect(e.detalles.map((d) => d.campo)).toContain(campo);
  });

  test("un campo que el contrato no define se rechaza (por ejemplo, intentar elegir la vivienda)", async () => {
    const e = esperarError(await api().post("/api/v1/visitas").set(auth(t.residente)).send(visitaUnica("Laura Méndez Ríos", 2, { viviendaId: 2 })), 400, "VALIDACION_FALLIDA");
    expect(e.detalles).toEqual([{ campo: "viviendaId", mensaje: "Campo no permitido." }]);
  });

  test("no se puede crear una cuenta con rol inventado ni contraseña corta", async () => {
    const e = esperarError(await api().post("/api/v1/usuarios").set(auth(t.administrador)).send({
      nombreCompleto: "Prueba", correo: "prueba@correo.com", telefono: "4420000000", rol: "superusuario", contrasenaInicial: "123",
    }), 400, "VALIDACION_FALLIDA");
    expect(e.detalles.map((d) => d.campo)).toEqual(expect.arrayContaining(["rol", "contrasenaInicial"]));
  });

  test("un texto con intento de inyección SQL se trata como dato, no como consulta", async () => {
    const r = await api().get("/api/v1/usuarios?q=' OR '1'='1").set(auth(t.administrador));
    expect(r.status).toBe(200);
    expect(r.body.paginacion.total).toBe(0);
  });

  test("operaciones imposibles: parámetro fuera de rango, adeudo de 0 pesos, salida de un acceso que no existe", async () => {
    esperarError(await api().put("/api/v1/parametros/tolerancia_minutos").set(auth(t.administrador)).send({ valor: 99 }), 400, "VALIDACION_FALLIDA");
    esperarError(await api().post("/api/v1/adeudos").set(auth(t.administrador)).send({ viviendaId: 3, concepto: "Cuota", periodo: "2026-11", monto: 0 }), 400, "VALIDACION_FALLIDA");
    esperarError(await api().post("/api/v1/accesos/999999/salida").set(auth(t.guardia)).send({}), 404, "RECURSO_NO_ENCONTRADO");
    esperarError(await api().patch("/api/v1/usuarios/1").set(auth(t.administrador)).send({ activo: false }), 409, "CONFLICTO");
  });

  test("JSON mal formado responde 400 y un cuerpo de más de 100 KB responde 413", async () => {
    esperarError(await api().post("/api/v1/visitas").set(auth(t.residente)).set("Content-Type", "application/json").send('{"tipo": '), 400, "VALIDACION_FALLIDA");
    esperarError(await api().post("/api/v1/visitas").set(auth(t.residente)).send({ nombreVisitante: "x".repeat(150000) }), 413, "VALIDACION_FALLIDA");
  });

  test("paginación inválida responde 400", async () => {
    const e = esperarError(await api().get("/api/v1/visitas?pagina=0&limite=500").set(auth(t.residente)), 400, "VALIDACION_FALLIDA");
    expect(e.detalles.map((d) => d.campo)).toEqual(expect.arrayContaining(["pagina", "limite"]));
  });
});
