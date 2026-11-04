// Rutas públicas de usuarios (E05 a E08). Se publican en el gateway bajo /api/v1/usuarios.
// La verificación del token y del rol administrador se agrega en la Entrega 6.
const { Router } = require("express");
const v = require("../validators/usuarios.validator");
const c = require("../controllers/usuarios.controller");

const router = Router();

router.get("/", v.listar, c.listar);                 // E05 Listar usuarios
router.post("/", v.crear, c.crear);                  // E06 Crear usuario
router.get("/:usuarioId", v.obtener, c.obtener);     // E07 Consultar usuario
router.patch("/:usuarioId", v.actualizar, c.actualizar); // E08 Actualizar o desactivar usuario

module.exports = router;
