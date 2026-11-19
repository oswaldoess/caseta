// Flujo completo de negocio y sus errores: visita -> validación -> entrada -> historial -> salida.
const { api, auth, tokensDePrueba, visitaUnica, hoy, esperarError } = require("./utilidades");

let t;
const estado = {};
beforeAll(async () => { t = await tokensDePrueba(); });

describe("Flujo completo con un código", () => {
  test("1. el residente registra una visita y el servidor genera el código", async () => {
    const r = await api().post("/api/v1/visitas").set(auth(t.residente)).send(visitaUnica("Laura Méndez Ríos", 6, { placas: "umr-482-b" }));
    expect(r.status).toBe(201);
    expect(r.headers.location).toBe(`/api/v1/visitas/${r.body.id}`);
    expect(r.body).toMatchObject({ estado: "activa", viviendaId: 1, domicilio: "Av. de los Fresnos 214", placas: "UMR-482-B", tieneEntradas: false });
    expect(r.body.codigo).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    Object.assign(estado, { visitaId: r.body.id, codigo: r.body.codigo });
  });

  test("2. el guardia la ve entre las visitas de hoy", async () => {
    const r = await api().get("/api/v1/visitas?limite=100").set(auth(t.guardia));
    expect(r.body.datos.map((v) => v.id)).toContain(estado.visitaId);
  });

  test("3. el guardia valida el código (también en minúsculas)", async () => {
    const r = await api().get(`/api/v1/codigos/${estado.codigo.toLowerCase()}/validez`).set(auth(t.guardia));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ codigo: estado.codigo, valido: true, motivo: null });
  });

  test("4. el guardia registra la entrada", async () => {
    const r = await api().post("/api/v1/accesos").set(auth(t.guardia)).send({ codigo: estado.codigo, observaciones: "Llegó en auto gris." });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ visitaId: estado.visitaId, salida: null, observaciones: "Llegó en auto gris." });
    estado.accesoId = r.body.id;
  });

  test("5. la visita queda utilizada y aparece en el historial del residente", async () => {
    const v = await api().get(`/api/v1/visitas/${estado.visitaId}`).set(auth(t.residente));
    expect(v.body).toMatchObject({ estado: "utilizada", tieneEntradas: true });
    const h = await api().get("/api/v1/accesos?dentro=true&limite=100").set(auth(t.residente));
    expect(h.body.datos.map((a) => a.id)).toContain(estado.accesoId);
  });

  test("6. el guardia registra la salida y no puede registrarla dos veces (RN07)", async () => {
    const r = await api().post(`/api/v1/accesos/${estado.accesoId}/salida`).set(auth(t.guardia)).send({});
    expect(r.status).toBe(201);
    expect(new Date(r.body.salida) >= new Date(r.body.entrada)).toBe(true);
    esperarError(await api().post(`/api/v1/accesos/${estado.accesoId}/salida`).set(auth(t.guardia)), 409, "SALIDA_YA_REGISTRADA");
  });

  test("7. el código ya no permite otra entrada (RN04)", async () => {
    const e = esperarError(await api().post("/api/v1/accesos").set(auth(t.guardia)).send({ codigo: estado.codigo }), 422, "CODIGO_NO_VALIDO");
    expect(e.detalles[0].mensaje).toBe("motivo: ya_utilizado");
  });

  test("8. una visita con entrada no se modifica ni se cancela (RN06)", async () => {
    esperarError(await api().patch(`/api/v1/visitas/${estado.visitaId}`).set(auth(t.residente)).send({ numeroPersonas: 2 }), 409, "VISITA_CON_ENTRADA");
    esperarError(await api().delete(`/api/v1/visitas/${estado.visitaId}`).set(auth(t.residente)), 409, "VISITA_CON_ENTRADA");
  });

  test("9. otra residente no puede ver la visita ni el acceso (404)", async () => {
    esperarError(await api().get(`/api/v1/visitas/${estado.visitaId}`).set(auth(t.residente2)), 404, "RECURSO_NO_ENCONTRADO");
    esperarError(await api().get(`/api/v1/accesos/${estado.accesoId}`).set(auth(t.residente2)), 404, "RECURSO_NO_ENCONTRADO");
  });
});

describe("Cancelación, visitas frecuentes y no programadas", () => {
  test("una visita cancelada ya no sirve en la caseta", async () => {
    const v = await api().post("/api/v1/visitas").set(auth(t.residente)).send(visitaUnica("Héctor Ortega Luna", 2));
    await api().delete(`/api/v1/visitas/${v.body.id}`).set(auth(t.residente)).expect(204);
    const r = await api().get(`/api/v1/codigos/${v.body.codigo}/validez`).set(auth(t.guardia));
    expect(r.body).toMatchObject({ valido: false, motivo: "cancelado" });
    esperarError(await api().post("/api/v1/accesos").set(auth(t.guardia)).send({ codigo: v.body.codigo }), 422, "CODIGO_NO_VALIDO");
    esperarError(await api().delete(`/api/v1/visitas/${v.body.id}`).set(auth(t.residente)), 409, "CONFLICTO");
  });

  test("una visita frecuente entra varias veces, pero no si ya está dentro (RN05)", async () => {
    const h = hoy();
    const v = await api().post("/api/v1/visitas").set(auth(t.residente)).send({
      tipo: "frecuente", nombreVisitante: "Rosa Hernández Gil", numeroPersonas: 1, fechaInicio: h.fecha,
      fechaFin: "2027-02-15", horaInicio: h.horaInicio, horaFin: h.horaFin, diasSemana: [h.dia],
    });
    expect(v.status).toBe(201);
    const entrada = await api().post("/api/v1/accesos").set(auth(t.guardia)).send({ codigo: v.body.codigo }).expect(201);
    const e = esperarError(await api().post("/api/v1/accesos").set(auth(t.guardia)).send({ codigo: v.body.codigo }), 422, "CODIGO_NO_VALIDO");
    expect(e.detalles[0].mensaje).toBe("motivo: ya_dentro");
    await api().post(`/api/v1/accesos/${entrada.body.id}/salida`).set(auth(t.guardia)).expect(201);
    const otra = await api().post("/api/v1/accesos").set(auth(t.guardia)).send({ codigo: v.body.codigo }).expect(201);
    await api().post(`/api/v1/accesos/${otra.body.id}/salida`).set(auth(t.guardia)).expect(201);
  });

  test("entrada de una visita no programada y vivienda desactivada", async () => {
    const ok = await api().post("/api/v1/accesos").set(auth(t.guardia)).send({
      visitaNoProgramada: { viviendaId: 1, nombreVisitante: "Jorge Salas Peña", numeroPersonas: 1, autorizadoPor: "Carlos Ramírez Soto" },
    });
    expect(ok.status).toBe(201);
    expect(ok.body.tipoVisita).toBe("no_programada");
    await api().post(`/api/v1/accesos/${ok.body.id}/salida`).set(auth(t.guardia)).expect(201);
    esperarError(await api().post("/api/v1/accesos").set(auth(t.guardia)).send({
      visitaNoProgramada: { viviendaId: 6, nombreVisitante: "Pintor Martínez", numeroPersonas: 1, autorizadoPor: "Administración" },
    }), 422, "REFERENCIA_INVALIDA");
  });
});
