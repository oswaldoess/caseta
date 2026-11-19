// Pruebas de Caseta (Entrega 7).
//   unidad:      lógica crítica sin base de datos ni red (reglas, fechas, errores, permisos, token).
//   integracion: peticiones reales al API Gateway con los seis procesos levantados y MySQL.
module.exports = {
  projects: [
    {
      displayName: "unidad",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/unidad/**/*.test.js"],
    },
    {
      displayName: "integracion",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/integracion/**/*.test.js"],
      globalSetup: "<rootDir>/tests/integracion/preparar.js",
      globalTeardown: "<rootDir>/tests/integracion/terminar.js",
    },
  ],
  testTimeout: 30000,
};
