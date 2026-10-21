// Tabla de enrutamiento del gateway (documento de la Entrega 3, Tabla 4).
module.exports = () => [
  { servicio: "identidad", url: process.env.URL_IDENTIDAD || "http://localhost:3001", prefijos: ["/api/v1/sesiones", "/api/v1/usuarios"] },
  { servicio: "viviendas", url: process.env.URL_VIVIENDAS || "http://localhost:3002", prefijos: ["/api/v1/viviendas"] },
  { servicio: "visitas", url: process.env.URL_VISITAS || "http://localhost:3003", prefijos: ["/api/v1/visitas"] },
  { servicio: "accesos", url: process.env.URL_ACCESOS || "http://localhost:3004", prefijos: ["/api/v1/codigos", "/api/v1/accesos"] },
  { servicio: "reglas", url: process.env.URL_REGLAS || "http://localhost:3005", prefijos: ["/api/v1/adeudos", "/api/v1/parametros"] },
];
