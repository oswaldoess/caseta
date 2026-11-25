# Plan y evidencia de pruebas (Entrega 7)

## Objetivo

Comprobar que la API cumple su contrato (`docs/api/openapi.yaml`) y las reglas de negocio (`docs/reglas-negocio.md`), que rechaza lo que no debe aceptar (errores y permisos, no solo el camino feliz) y que la validación de un código cumple RNF04 con 50 peticiones simultáneas.

## Niveles de prueba

| Nivel | Herramienta | Qué cubre | Cómo se ejecuta |
|---|---|---|---|
| Unidad | Jest | Lógica crítica sin base de datos ni red: validez de un código (RN04, RN05 y la tolerancia de 15 minutos), límite por adeudo (RN03), fechas en hora de México, validaciones, formato de errores, permisos por rol y verificación del token en el gateway. | `npm run test:unidad` |
| Integración | Jest + Supertest | Peticiones reales al gateway con los seis procesos y MySQL: autenticación, matriz de permisos, flujo completo, reglas, validación de entradas, CORS y concurrencia. | `npm run test:integracion` (levanta los servicios si no están corriendo) |
| Funcional (regresión) | Postman / Newman | La colección de la Entrega 6: 118 peticiones y 258 verificaciones, 56 casos negativos. | `npx newman run docs/postman/Caseta_Entrega6.postman_collection.json` |
| Carga | `scripts/prueba-carga.js` | RNF04: `GET /codigos/{codigo}/validez` con 50 peticiones simultáneas. | `npm run prueba:carga` |
| Seguridad | Revisión manual con comandos | Secretos, contraseñas, CORS, encabezados, errores sin información interna, `npm audit`. | `docs/seguridad.md` |

`npm test` corre unidad e integración juntas.

## Casos de prueba automatizados

| Archivo | Pruebas | Casos principales |
|---|---|---|
| `tests/unidad/validez-codigo.test.js` | Validez de un código | Válido; `cancelado`, `vencido`, `ya_utilizado`, `aun_no_vigente`, `dia_no_permitido`, `ya_dentro`; límites exactos de la tolerancia (15 min sí, 16 min no, antes y después del horario); prioridad de `cancelado`. |
| `tests/unidad/regla-adeudo.test.js` | RN03 | Sin adeudo no hay límite; con adeudo 7 + 3 llega justo a 10 y 7 + 4 se rechaza con el motivo; las personas restantes nunca son negativas. |
| `tests/unidad/fechas-y-validaciones.test.js` | Utilidades | Fechas imposibles (30 de febrero), horas, enteros JSON, día de la semana, suma de meses. |
| `tests/unidad/errores-y-permisos.test.js` | Middleware común | Formato estándar 400/404/413/422/500; un error interno no expone el mensaje ni la pila; `soloDesdeGateway`; `permitir` por rol. |
| `tests/unidad/token-gateway.test.js` | Gateway | Rutas públicas; sin token; token válido; esquema `bearer` en minúsculas; expirado; firmado con otro secreto; `alg: none`; revocado; Identidad caída (503); encabezados de identidad falsificados. |
| `tests/integracion/autenticacion.test.js` | E01, E02, E04 | Token de 8 h sin contraseña en la respuesta; credenciales incorrectas y cuenta desactivada con el mismo mensaje; 400 por campos; 429 al sexto intento; tokens falsos, vencidos y de otro secreto; cerrar sesión; desactivar cuenta; cambiar contraseña; llamada directa al servicio; CORS. |
| `tests/integracion/permisos.test.js` | Autorización | 24 combinaciones rol/endpoint prohibidas (403); el residente solo ve su vivienda, visitas e historial (404 para lo ajeno); el guardia solo consulta lo de hoy. |
| `tests/integracion/flujo-visita.test.js` | Flujo de negocio | Visita → validación → entrada → historial → salida; RN04, RN06, RN07; cancelación; visita frecuente con RN05; visita no programada y vivienda desactivada. |
| `tests/integracion/reglas-y-validaciones.test.js` | Reglas y entradas | RN03 con adeudo y al liquidarlo; todos los errores de validación juntos; fechas y horas inválidas; campos no permitidos; rol inventado; inyección SQL tratada como texto; operaciones imposibles; JSON mal formado; cuerpo de más de 100 KB; paginación inválida. |
| `tests/integracion/concurrencia.test.js` | Concurrencia | 10 entradas simultáneas con el mismo código: exactamente una 201 y las demás 409/422; una sola fila en el historial. |

## Resultados

| Prueba | Resultado | Evidencia |
|---|---|---|
| `npm test` | 10 archivos, 121 pruebas, 121 aprobadas (54 de unidad y 67 de integración) | `docs/evidencias/entrega7/pruebas-npm-test.txt` |
| Postman (regresión) | 118 peticiones, 258 verificaciones, 0 fallas | `docs/evidencias/entrega7/regresion-postman.txt` |
| Carga (RNF04) | 20 rondas de 50 simultáneas: p99 = 248 ms. 50 clientes sostenidos 15 s: 334 peticiones/s, p99 = 238 ms. 0 errores. Cumple (< 1000 ms). | `docs/evidencias/entrega7/prueba-carga.txt` |
| Seguridad | Lista de verificación completa | `docs/seguridad.md`, `docs/evidencias/entrega7/seguridad.txt` |

La prueba de carga se corrió en una máquina de 2 núcleos con MySQL, los seis procesos y el generador de carga juntos, así que en un servidor real los tiempos deberían ser menores. Primero se intentó con autocannon, pero en esa máquina reportaba latencias que no correspondían con su propio número de peticiones por segundo (el generador competía por el procesador con los servicios); por eso el script mide cada petición con `fetch` de punta a punta.

## Datos de prueba

Las pruebas usan las cuentas de `database/02_datos_prueba.sql` (contraseña `Caseta2026!`). Cada prueba crea sus propias visitas con nombres y horarios calculados en la hora de México, así que se pueden repetir sin reiniciar la base. Las que modifican datos compartidos (desactivar una cuenta, cambiar una contraseña) los dejan como estaban al terminar.

## Corrida final (Entrega 8)

Se repitieron todas las pruebas el 25 de noviembre de 2026 sobre la versión 1.0.0, con la base recién creada.

| Prueba | Resultado | Evidencia |
|---|---|---|
| `npm test` | 10 archivos, 121 pruebas, 121 aprobadas | `docs/evidencias/entrega8/pruebas-npm-test.txt` |
| Demo final (Postman) | 25 peticiones, 56 verificaciones, 0 fallas | `docs/evidencias/entrega8/demo-postman.txt` |
| Regresión (Postman) | 118 peticiones, 258 verificaciones, 0 fallas | `docs/evidencias/entrega8/regresion-postman.txt` |
| Carga (RNF04) | 50 simultáneas: p99 = 299 ms; 50 clientes sostenidos 15 s: 381 peticiones/s, p99 = 296 ms; 0 errores. Cumple. | `docs/evidencias/entrega8/prueba-carga.txt` |
| Servicio caído (RNF06) | Con Reglas detenido: `/health` y las rutas que lo necesitan responden 503 sin guardar nada; los demás servicios siguen respondiendo. | `docs/evidencias/entrega8/servicio-caido-503.txt` |
| Respaldo de la base | `caseta_respaldo.sql` se restauró en una base vacía y las 26 pruebas de restricciones salieron rechazadas. | `database/respaldo/` |
