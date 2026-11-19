require("dotenv").config();
require("@caseta/shared").verificarConfiguracion("identidad", ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "CLAVE_SERVICIO", "JWT_SECRET"]);
const app = require("./app");

const puerto = Number(process.env.PORT) || 3001;
app.listen(puerto, () => console.log("S1. Identidad escuchando en http://localhost:" + puerto));
