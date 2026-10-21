require("dotenv").config();
const app = require("./app");

const puerto = Number(process.env.PORT) || 3003;
app.listen(puerto, () => console.log("S3. Visitas escuchando en http://localhost:" + puerto));
