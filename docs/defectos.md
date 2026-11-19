# Defectos encontrados y corregidos

## Entrega 7 (pruebas y revisión de seguridad)

| ID | Defecto | Cómo se encontró | Causa | Corrección | Prueba que lo cubre |
|---|---|---|---|---|---|
| D01 | Un cuerpo de más de 100 KB respondía 500 en lugar de un error del cliente. | Prueba con un JSON de 200 KB. | El manejador de errores no reconocía `entity.too.large` de Express. | `shared/src/errores.js` responde 413 con el formato estándar (y 4xx para otros errores de lectura del cuerpo). | `errores-y-permisos.test.js`, `reglas-y-validaciones.test.js` |
| D02 | `Authorization: bearer <token>` (en minúsculas) se rechazaba con 401. | Revisión contra RFC 6750, que dice que el esquema no distingue mayúsculas. | Se comparaba con `startsWith("Bearer ")`. | `gateway/src/autenticacion.js` separa esquema y token y compara sin mayúsculas. | `token-gateway.test.js` |
| D03 | El cliente podía mandar cualquier texto en `X-Request-Id` y se copiaba a los registros y a las respuestas. | Revisión de seguridad (inyección en registros). | Se aceptaba el encabezado sin validar. | Solo se acepta si cumple `^[A-Za-z0-9_-]{1,64}$`; si no, el gateway genera uno. | `seguridad.txt` punto 9 |
| D04 | El registro de intentos de inicio de sesión crecía sin límite (un correo distinto por intento). | Revisión de código del límite de intentos. | Las claves viejas solo se limpiaban si se volvía a usar el mismo correo. | Limpieza cada minuto con `setInterval(...).unref()`. | `autenticacion.test.js` (429) |
| D05 | Un origen no permitido recibía `Access-Control-Allow-Origin: http://localhost:5173`. | `curl` con `Origin: http://sitio-ajeno.com`. | CORS se configuró con un solo origen fijo. | Lista de orígenes en `CORS_ORIGEN`; uno que no está no recibe el encabezado. | `autenticacion.test.js` (CORS) |
| D06 | Si faltaba una variable de entorno, el servicio arrancaba y fallaba con 500 en la primera petición. | Arranque sin `.env`. | No se revisaba la configuración al iniciar. | `shared/src/configuracion.js`: cada servicio revisa sus variables; en producción rechaza los valores de ejemplo. | `seguridad.txt` punto 4 |
| D07 | `npm run setup:env` copiaba `JWT_SECRET=cambiar_este_secreto` tal cual, así que todas las instalaciones compartían el mismo secreto conocido. | Revisión de secretos. | El script solo copiaba `.env.example`. | Genera `JWT_SECRET` y `CLAVE_SERVICIO` aleatorios (los mismos para todas las carpetas) o reutiliza los que ya existan. | Manual (`npm run setup:env` en una copia limpia) |
| D08 | Viviendas, Visitas, Accesos y Reglas tenían `JWT_SECRET` aunque no lo usan. | Revisión de mínimo privilegio. | Se copió el mismo `.env.example` en todos los servicios. | Se quitó de sus `.env.example`; solo lo tienen el gateway e Identidad. | `.env.example` |
| D09 | Swagger UI no estaba disponible y varios endpoints de `openapi.yaml` no documentaban sus respuestas 401, 403, 404 o 503. | Revisión de la documentación contra las pruebas. | — | Swagger UI en `/api/docs`; se agregaron las respuestas faltantes (validado con swagger-cli). | `seguridad.txt` punto 10 |

## Entregas 5 y 6 (encontrados durante el desarrollo)

| ID | Defecto | Corrección |
|---|---|---|
| A01 | En Express 5 `req.query` es de solo lectura y los filtros saneados no se aplicaban. | Se leen con `matchedData(req)`. |
| A02 | MySQL convertía fechas a UTC y una visita de hoy aparecía como de ayer. | `dateStrings: true` y zona `-06:00` en la sesión de MySQL. |
| A03 | Cerrar sesión fallaba porque el usuario de Identidad no tenía permiso `UPDATE` sobre `tokens_revocados`. | `INSERT IGNORE` (solo necesita `INSERT`). |
| A04 | Validaciones condicionales no se aplicaban porque `.if()` estaba después del validador. | `.if()` al inicio de la cadena. |
| A05 | `PATCH` con un campo vacío después del saneo mandaba `undefined` a MySQL (500). | Los repositorios ignoran los campos `undefined`. |
| A06 | Dos guardias podían registrar la entrada del mismo código al mismo tiempo. | Transacción con `SELECT … FOR UPDATE` en Visitas e índice único `uq_accesos_visita_dentro`. |
| A07 | La colección de Postman fallaba otro día porque tenía fechas fijas. | Las fechas y horas se calculan en un script previo con la hora de México. |
| A08 | El límite de intentos contaba mal el primer intento fallido. | Se corrigió la ventana de un minuto. |
