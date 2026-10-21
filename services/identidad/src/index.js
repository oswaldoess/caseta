require("dotenv").config();
const app = require("./app");

const puerto = Number(process.env.PORT) || 3001;
app.listen(puerto, () => console.log("S1. Identidad escuchando en http://localhost:" + puerto));
