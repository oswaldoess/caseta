// RN03: límite de personas por día para viviendas con adeudo (S5. Reglas, I04). La base se simula.
jest.mock("../../services/reglas/src/repositories/reglas.repository", () => ({
  tieneAdeudoPendiente: jest.fn(),
  buscarParametro: jest.fn(async () => ({ clave: "limite_personas_con_adeudo", valor: 10, minimo: 1, maximo: 50 })),
}));
const repo = require("../../services/reglas/src/repositories/reglas.repository");
const { evaluarLimite } = require("../../services/reglas/src/services/reglas.service");

const pedir = (personasSolicitadas, personasYaRegistradas) =>
  evaluarLimite({ viviendaId: 3, fecha: "2026-11-18", personasSolicitadas, personasYaRegistradas });

describe("Regla del límite por adeudo (RN03)", () => {
  test("sin adeudo pendiente no hay límite", async () => {
    repo.tieneAdeudoPendiente.mockResolvedValue(false);
    const r = await pedir(20, 40);
    expect(r.permitido).toBe(true);
    expect(r.disponibles).toBeNull();
  });

  test("con adeudo, 7 ya registradas + 3 llega justo al límite de 10", async () => {
    repo.tieneAdeudoPendiente.mockResolvedValue(true);
    const r = await pedir(3, 7);
    expect(r).toMatchObject({ permitido: true, tieneAdeudoPendiente: true, limite: 10, disponibles: 3 });
  });

  test("con adeudo, 7 ya registradas + 4 se rechaza y explica el motivo", async () => {
    repo.tieneAdeudoPendiente.mockResolvedValue(true);
    const r = await pedir(4, 7);
    expect(r.permitido).toBe(false);
    expect(r.disponibles).toBe(3);
    expect(r.motivo).toContain("solo puede recibir 10 personas por día");
    expect(r.motivo).toContain("18/11/2026");
  });

  test("si ya se pasó del límite, quedan 0 disponibles (nunca negativo)", async () => {
    repo.tieneAdeudoPendiente.mockResolvedValue(true);
    const r = await pedir(1, 12);
    expect(r.permitido).toBe(false);
    expect(r.disponibles).toBe(0);
  });
});
