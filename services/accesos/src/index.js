require("dotenv").config();
require("@caseta/shared").verificarConfiguracion("accesos", ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "CLAVE_SERVICIO"]);
const app = require("./app");

const puerto = Number(process.env.PORT) || 3004;
app.listen(puerto, () => console.log("S4. Accesos escuchando en http://localhost:" + puerto));
