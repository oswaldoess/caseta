// RN04 y RN05: cuándo un código permite la entrada (lógica pura de S4. Accesos).
const { evaluar } = require("../../services/accesos/src/services/accesos.service");

const ahora = { fecha: "2026-11-18", hora: "18:30", minutos: 18 * 60 + 30, diaSemana: "miercoles" };
const base = {
  tipo: "unica", estado: "activa", fechaInicio: "2026-11-18", fechaFin: "2026-11-18",
  horaInicio: "18:00", horaFin: "23:00", diasSemana: [],
};
const conHora = (hora) => ({ ...ahora, hora, minutos: Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3)) });

describe("Validez de un código (RN04, RN05)", () => {
  test("una visita activa dentro de su horario es válida", () => {
    expect(evaluar(base, 15, false, ahora)).toEqual({ valido: true, motivo: null, mensaje: "Acceso permitido." });
  });

  test.each([
    ["cancelado", { estado: "cancelada" }],
    ["ya_utilizado", { estado: "utilizada" }],
    ["vencido", { estado: "vencida" }],
    ["vencido", { fechaInicio: "2026-11-10", fechaFin: "2026-11-10" }],
    ["aun_no_vigente", { fechaInicio: "2026-11-20", fechaFin: "2026-11-20" }],
    ["dia_no_permitido", { tipo: "frecuente", fechaInicio: "2026-11-01", fechaFin: "2027-03-01", diasSemana: ["lunes", "jueves"] }],
  ])("motivo %s", (motivo, cambios) => {
    const r = evaluar({ ...base, ...cambios }, 15, false, ahora);
    expect(r.valido).toBe(false);
    expect(r.motivo).toBe(motivo);
  });

  test("la tolerancia permite llegar 15 minutos antes, pero no 16", () => {
    expect(evaluar(base, 15, false, conHora("17:45")).valido).toBe(true);
    const r = evaluar(base, 15, false, conHora("17:44"));
    expect(r.motivo).toBe("fuera_de_horario");
    expect(r.mensaje).toContain("de 17:45 a 23:15");
  });

  test("la tolerancia también aplica después de la hora de fin", () => {
    expect(evaluar(base, 15, false, conHora("23:15")).valido).toBe(true);
    expect(evaluar(base, 15, false, conHora("23:16")).motivo).toBe("fuera_de_horario");
  });

  test("una visita frecuente en su día es válida, pero no si ya está dentro (RN05)", () => {
    const frecuente = { ...base, tipo: "frecuente", fechaInicio: "2026-11-01", fechaFin: "2027-03-01", diasSemana: ["miercoles"] };
    expect(evaluar(frecuente, 15, false, ahora).valido).toBe(true);
    expect(evaluar(frecuente, 15, true, ahora).motivo).toBe("ya_dentro");
  });

  test("cancelada gana sobre cualquier otro motivo", () => {
    const r = evaluar({ ...base, estado: "cancelada", fechaInicio: "2026-12-01", fechaFin: "2026-12-01" }, 15, true, ahora);
    expect(r.motivo).toBe("cancelado");
  });
});
