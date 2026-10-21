require("dotenv").config();
const app = require("./app");

const puerto = Number(process.env.PORT) || 3002;
app.listen(puerto, () => console.log("S2. Viviendas escuchando en http://localhost:" + puerto));
