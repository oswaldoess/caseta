// Funciones de fechas y validadores que usan todas las reglas de horario (shared).
const { sumarDias, sumarMeses, diaSemana, aMinutos, deMinutos, fechaLegible, esFecha, esHora, aIso } = require("@caseta/shared");

describe("Fechas", () => {
  test("sumarDias cruza meses y años", () => {
    expect(sumarDias("2026-12-30", 3)).toBe("2027-01-02");
  });
  test("sumarMeses respeta el último día del mes (31 de agosto + 6 meses = 28 de febrero)", () => {
    expect(sumarMeses("2026-08-31", 6)).toBe("2027-02-28");
    expect(sumarMeses("2026-11-18", 6)).toBe("2027-05-18");
  });
  test("diaSemana devuelve el nombre en español sin acentos", () => {
    expect(diaSemana("2026-11-18")).toBe("miercoles");
    expect(diaSemana("2026-11-22")).toBe("domingo");
  });
  test("deMinutos no se sale del día al restar o sumar la tolerancia", () => {
    expect(deMinutos(aMinutos("00:05") - 15)).toBe("00:00");
    expect(deMinutos(aMinutos("23:50") + 15)).toBe("23:59");
    expect(deMinutos(aMinutos("18:00") - 15)).toBe("17:45");
  });
  test("fechaLegible y aIso dan el formato de la API", () => {
    expect(fechaLegible("2026-10-24")).toBe("24/10/2026");
    expect(aIso("2026-10-24 18:07:12")).toBe("2026-10-24T18:07:12-06:00");
    expect(aIso(null)).toBeNull();
  });
});

describe("Validadores de entrada", () => {
  test.each([
    ["2026-11-18", true], ["2026-02-30", false], ["2026-13-01", false], ["18/11/2026", false], ["", false], [20261118, false],
  ])("esFecha(%p) = %p", (valor, esperado) => expect(esFecha(valor)).toBe(esperado));

  test.each([
    ["00:00", true], ["23:59", true], ["24:00", false], ["9:00", false], ["18:60", false], ["18:00:00", false],
  ])("esHora(%p) = %p", (valor, esperado) => expect(esHora(valor)).toBe(esperado));
});
