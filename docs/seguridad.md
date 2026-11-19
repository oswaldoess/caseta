# Lista de verificación de seguridad (Entrega 7)

Evidencia con la salida real de cada comando: `docs/evidencias/entrega7/seguridad.txt`. Pruebas automatizadas: `tests/`.

| # | Punto | Estado | Cómo se cumple | Cómo se comprobó |
|---|---|---|---|---|
| 1 | No hay contraseñas en texto plano | Cumple | bcrypt con costo 10 (`contrasena_hash`, 60 caracteres). Ninguna respuesta devuelve la contraseña ni el hash. | Consulta a `usuarios`; prueba "devuelve un token… y nunca la contraseña". |
| 2 | No hay secretos reales en el repositorio | Cumple | `.env` está en `.gitignore`; solo se suben `.env.example` con valores de ejemplo. `npm run setup:env` genera `JWT_SECRET` y `CLAVE_SERVICIO` aleatorios en cada máquina. | `git ls-files`, `git check-ignore`, búsqueda de claves privadas y tokens con `git grep`. |
| 3 | Configuración sensible separada del código | Cumple | Todo sale de variables de entorno. Cada servicio revisa al iniciar que existan sus variables; en producción (`NODE_ENV=production`) se niega a arrancar con los valores de ejemplo o con un `JWT_SECRET` de menos de 32 caracteres. | Arranque con valores de ejemplo y sin variables: código de salida 1. |
| 4 | Mínimo privilegio | Cumple | Cada servicio tiene su propio usuario de MySQL con permisos solo sobre sus tablas. Solo el gateway e Identidad conocen `JWT_SECRET`. | `database/04_usuarios_servicios.sql`; `.env.example` de cada servicio. |
| 5 | Endpoints protegidos validan autenticación | Cumple | El gateway exige `Authorization: Bearer` en toda ruta salvo `POST /sesiones` y `GET /health`; revisa firma (solo HS256), emisor, vigencia de 8 h y, con Identidad, si el token se cerró o la cuenta se desactivó. | Pruebas de token (unidad e integración): sin token, falso, vencido, otro secreto, `alg: none`, revocado, cuenta desactivada. |
| 6 | Endpoints sensibles validan autorización | Cumple | `permitir(...roles)` en cada ruta; el residente solo ve su vivienda (lo ajeno responde 404) y el guardia solo lo del día. | `permisos.test.js`: 24 combinaciones prohibidas y filtros por dueño. |
| 7 | Los servicios no se pueden usar sin pasar por el gateway | Cumple | El gateway borra los encabezados de identidad que mande el cliente y agrega la clave de servicio; cada servicio rechaza lo que no la trae. | Llamada directa a `:3001` con `X-Usuario-Rol: administrador` → 401. |
| 8 | Entradas validadas | Cumple | express-validator en cada contrato: tipos, rangos, formatos, fechas reales, campos no permitidos; consultas SQL parametrizadas; cuerpo máximo de 100 KB. | `reglas-y-validaciones.test.js`; colección Postman (56 casos negativos). |
| 9 | Los errores no revelan información interna | Cumple | Formato estándar `{ error: { codigo, mensaje, … } }`. Un error no previsto responde 500 genérico; el detalle solo va al registro del servidor. Sin `X-Powered-By`. | Prueba de 500 sin pila; JSON mal formado (400); cuerpo grande (413). |
| 10 | Manejo de CORS | Cumple | Solo los orígenes de `CORS_ORIGEN` (separados por coma) reciben `Access-Control-Allow-Origin`; métodos y encabezados permitidos explícitos. | `curl` con origen permitido y con origen ajeno; prueba de CORS. |
| 11 | No se aceptan operaciones imposibles | Cumple | Reglas RN01–RN09 en el servidor; estados revisados en el `UPDATE`; índices únicos y transacciones contra dobles entradas. | Flujo completo, reglas y prueba de concurrencia (10 entradas simultáneas → 1). |
| 12 | Protección contra fuerza bruta | Cumple | 5 intentos fallidos por minuto por correo e IP → 429; mismo mensaje para correo inexistente, contraseña incorrecta o cuenta desactivada. | Prueba "el sexto intento fallido… responde 429". |
| 13 | Encabezados de seguridad | Cumple | helmet (CSP, HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`). | `curl -I`. |
| 14 | Dependencias sin vulnerabilidades conocidas | Cumple | `npm audit --omit=dev`: 0 vulnerabilidades en lo que se ejecuta en producción. | Salida de `npm audit`. |

## Pendientes para producción (fuera del alcance del curso)

- Servir el gateway detrás de HTTPS (proxy inverso con certificado); hoy HSTS solo tiene efecto con HTTPS.
- Guardar los secretos en un gestor de secretos en lugar de archivos `.env`.
- El límite de intentos de inicio de sesión vive en la memoria de Identidad; con varias instancias habría que moverlo a una base compartida (por ejemplo Redis).
