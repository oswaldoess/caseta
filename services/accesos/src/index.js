require("dotenv").config();
const app = require("./app");

const puerto = Number(process.env.PORT) || 3004;
app.listen(puerto, () => console.log("S4. Accesos escuchando en http://localhost:" + puerto));
