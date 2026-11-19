require("dotenv").config();
require("@caseta/shared").verificarConfiguracion("visitas", ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "CLAVE_SERVICIO"]);
const app = require("./app");

const puerto = Number(process.env.PORT) || 3003;
app.listen(puerto, () => console.log("S3. Visitas escuchando en http://localhost:" + puerto));
