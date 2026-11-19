// Concurrencia: varios guardias registran la entrada del mismo código al mismo tiempo.
const { api, auth, tokensDePrueba, iniciarSesion, visitaUnica } = require("./utilidades");

test("10 entradas simultáneas con el mismo código dejan una sola entrada", async () => {
  const t = await tokensDePrueba();
  const otroGuardia = await iniciarSesion("sandra.aguilar@correo.com");
  const v = await api().post("/api/v1/visitas").set(auth(t.residente)).send(visitaUnica("Daniel Ochoa Ruiz", 1));
  expect(v.status).toBe(201);

  const respuestas = await Promise.all(Array.from({ length: 10 }, (_, i) =>
    api().post("/api/v1/accesos").set(auth(i % 2 ? t.guardia : otroGuardia)).send({ codigo: v.body.codigo })));
  const estados = respuestas.map((r) => r.status).sort();
  expect(estados.filter((s) => s === 201)).toHaveLength(1);
  // Las demás se rechazan: 409 si llegaron al mismo tiempo, 422 (ya_utilizado) si llegaron después.
  estados.filter((s) => s !== 201).forEach((s) => expect([409, 422]).toContain(s));

  const historial = await api().get(`/api/v1/accesos?viviendaId=1&limite=100`).set(auth(t.administrador));
  expect(historial.body.datos.filter((a) => a.visitaId === v.body.id)).toHaveLength(1);
  const visita = await api().get(`/api/v1/visitas/${v.body.id}`).set(auth(t.residente));
  expect(visita.body.estado).toBe("utilizada");
});
