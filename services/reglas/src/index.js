require("dotenv").config();
const app = require("./app");

const puerto = Number(process.env.PORT) || 3005;
app.listen(puerto, () => console.log("S5. Reglas y Adeudos escuchando en http://localhost:" + puerto));
