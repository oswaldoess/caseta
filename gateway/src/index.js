require("dotenv").config();
const app = require("./app");

const puerto = Number(process.env.PORT) || 3000;
app.listen(puerto, () => console.log("API Gateway escuchando en http://localhost:" + puerto + "/api/v1"));
