require("dotenv").config();
require("@caseta/shared").verificarConfiguracion("reglas", ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "CLAVE_SERVICIO"]);
const app = require("./app");

const puerto = Number(process.env.PORT) || 3005;
app.listen(puerto, () => console.log("S5. Reglas y Adeudos escuchando en http://localhost:" + puerto));
