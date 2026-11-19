// Rutas públicas de usuarios (E03 a E08). Se publican en el gateway bajo /api/v1/usuarios.
// Entrega 6: cada ruta indica qué roles pueden usarla (Entrega 3, columna "Roles").
const { Router } = require("express");
const { permitir } = require("@caseta/shared");
const v = require("../validators/usuarios.validator");
const vs = require("../validators/sesiones.validator");
const c = require("../controllers/usuarios.controller");
const cs = require("../controllers/sesiones.controller");

const router = Router();
const admin = permitir("administrador");

// Las rutas /me van primero para que "me" no se lea como un usuarioId.
router.get("/me", permitir(), cs.perfil);                                          // E03 Consultar mi perfil
router.put("/me/contrasena", permitir(), vs.cambiarContrasena, cs.cambiarContrasena); // E04 Cambiar mi contraseña

router.get("/", admin, v.listar, c.listar);                     // E05 Listar usuarios
router.post("/", admin, v.crear, c.crear);                      // E06 Crear usuario
router.get("/:usuarioId", admin, v.obtener, c.obtener);         // E07 Consultar usuario
router.patch("/:usuarioId", admin, v.actualizar, c.actualizar); // E08 Actualizar o desactivar usuario

module.exports = router;
