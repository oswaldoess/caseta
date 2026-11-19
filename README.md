# Caseta

Sistema de control de visitas para fraccionamientos privados. Proyecto integrador de **Arquitectura Orientada a Servicios**, Ingeniería en Software, Universidad Politécnica de Santa Rosa Jáuregui.

El residente registra a su visita con anticipación y el sistema genera un código; el guardia lo valida en la caseta y registra la entrada y la salida; la administración consulta el historial y aplica el reglamento.

## Equipo

- María Fernanda Barrientos Mancilla
- Citlaly Zamudio Pérez
- Karen Citlalli Ortiz Barajas
- Oswaldo Escobar Rangel
- José Emiliano Pastrana Bazaldua
- Angelica Carbajal Sintora

Docente: Ing. Luis Leonardo Mendoza Reséndiz

## Arquitectura

Todas las peticiones entran por el **API Gateway** (`/api/v1`) y se reenvían a cinco servicios independientes:

| Servicio | Carpeta | Puerto | Responsabilidad |
|---|---|---|---|
| API Gateway | `gateway/` | 3000 | Punto único de entrada, verificación del token, enrutamiento, CORS, estado del sistema |
| S1. Identidad | `services/identidad/` | 3001 | Usuarios, roles, sesiones y tokens |
| S2. Viviendas | `services/viviendas/` | 3002 | Viviendas y asignación de residentes |
| S3. Visitas | `services/visitas/` | 3003 | Visitas y códigos de acceso |
| S4. Accesos | `services/accesos/` | 3004 | Validación de códigos, entradas, salidas e historial |
| S5. Reglas y Adeudos | `services/reglas/` | 3005 | Adeudos y parámetros del reglamento |

Cada servicio sigue la misma estructura en capas (ver *Estructura de un servicio*). El código común está en `shared/`.

## Requisitos

- Node.js 24 LTS (también funciona con Node.js 22)
- MySQL 8.0 u 8.4 (en `localhost:3306`; si usas otro puerto, cambia `DB_PORT` en los `.env` de `services/` y crea la base con `DB_PORT=3307 npm run db:crear`, o en PowerShell `$env:DB_PORT=3307; npm run db:crear`)
- Git
- Postman (para probar la colección)

## Cómo ejecutarlo

Desde la raíz del repositorio, en este orden:

```bash
npm install          # 1. instala las dependencias de todos los servicios
npm run setup:env    # 2. crea los archivos .env a partir de .env.example
npm run db:crear     # 3. crea la base caseta, los datos de prueba y un usuario de MySQL por servicio
npm run dev          # 4. levanta el gateway y los cinco servicios
```

- `npm run setup:env` también sirve después de un `git pull`: agrega a tus `.env` las variables nuevas sin cambiar las que ya tienes (por ejemplo, un `DB_PORT=3307`).
- `npm run db:crear` pide la contraseña de `root` de MySQL y ejecuta `01_esquema.sql`, `02_datos_prueba.sql` y `04_usuarios_servicios.sql`. Se puede repetir para dejar la base como nueva. Si prefieres la terminal de MySQL o Workbench, los mismos scripts están en `database/`.
- Para comprobar que todo funciona, abre http://localhost:3000/api/v1/health. Debe responder `"estado": "ok"` con los cinco servicios. Cada servicio revisa también su conexión a MySQL en su propio `/health` (por ejemplo http://localhost:3002/health).
- Para levantar un solo servicio: `npm run dev -w services/viviendas`.

Si un servicio no conecta a MySQL, revisa que `DB_USER` y `DB_PASSWORD` de su `.env` coincidan con los de `database/04_usuarios_servicios.sql`.

### Cuentas de prueba

Todas usan la contraseña `Caseta2026!`.

| Rol | Correo | Vivienda |
|---|---|---|
| Administrador | `patricia.gomez@correo.com` | — |
| Guardia | `miguel.torres@correo.com` (también `ricardo.nunez@…`, `sandra.aguilar@…`) | — |
| Residente | `carlos.ramirez@correo.com` | Av. de los Fresnos 214 (vivienda 1) |
| Residente | `monica.herrera@correo.com` | Calle Encino 15 (vivienda 3) |
| Residente con adeudo pendiente | `fernando.ortega@correo.com` | Av. de los Fresnos 218 (vivienda 2) |
| Cuenta desactivada | `jorge.medina@correo.com` | — |

### Probar con Postman

1. Importa `docs/postman/Caseta_Entrega6.postman_collection.json` (Import → File).
2. Con los servicios levantados, usa **Run collection** con el orden que trae. Las primeras peticiones inician sesión con cada rol y guardan los tokens; no hay que copiar nada a mano.
3. Son 118 peticiones con 258 verificaciones automáticas; 56 son casos negativos (401, 403, 404, 409, 422, 400).
4. La colección se puede correr varias veces sin reiniciar la base: crea correos, domicilios y visitas nuevos en cada corrida, y calcula la fecha y el horario de hoy en la hora de la Ciudad de México.

Desde la terminal: `npx newman run docs/postman/Caseta_Entrega6.postman_collection.json`.

Para probar una petición suelta en Postman, primero corre la carpeta **0. Estado del sistema e inicio de sesión** (guarda los tokens).

### Autenticación y permisos (Entrega 6)

1. `POST /sesiones` con correo y contraseña devuelve un token JWT que vale 8 horas.
2. Cada petición manda `Authorization: Bearer <token>`. El **gateway** revisa la firma y la vigencia, y pregunta a Identidad (ruta interna I01) si el token se cerró o si la cuenta se desactivó.
3. Si todo está bien, el gateway reenvía la petición con la identidad del usuario (`X-Usuario-Id`, `X-Usuario-Rol`) y la clave de servicio. Los encabezados que mande el cliente con esos nombres se borran.
4. Cada servicio decide qué puede hacer cada rol (`permitir(...)` en sus rutas) y qué datos ve: el residente solo los de su vivienda y el guardia solo los del día. Un servicio rechaza cualquier petición que no venga del gateway.

Rutas públicas: `POST /sesiones` y `GET /health`. Seis intentos fallidos de inicio de sesión en un minuto responden `429`.

### Flujo completo

```
Residente: POST /sesiones -> POST /visitas (Visitas pide a Viviendas su vivienda y a Reglas si aplica el límite por adeudo)
Guardia:   POST /sesiones -> GET /codigos/{codigo}/validez -> POST /accesos (transacción: acceso en Accesos + uso del código en Visitas)
Residente: GET /accesos?dentro=true           Guardia: POST /accesos/{accesoId}/salida
```

### Qué está implementado

Todas las rutas se consumen por el gateway en `http://localhost:3000/api/v1`.

| Endpoint | Operación | Roles |
|---|---|---|
| `POST /sesiones` | E01 Iniciar sesión | Público |
| `DELETE /sesiones/actual` | E02 Cerrar sesión | Todos |
| `GET /usuarios/me` | E03 Consultar mi perfil | Todos |
| `PUT /usuarios/me/contrasena` | E04 Cambiar mi contraseña | Todos |
| `GET, POST /usuarios` · `GET, PATCH /usuarios/{id}` | E05 a E08 Usuarios | Administrador |
| `GET, POST /viviendas` · `PATCH /viviendas/{id}` | E09, E10, E12 Viviendas | Administrador |
| `GET /viviendas/{id}` | E11 Consultar vivienda | Administrador; residente (solo la suya) |
| `GET, POST /viviendas/{id}/residentes` · `DELETE …/{usuarioId}` | E13 a E15 Residentes | Administrador |
| `GET /visitas` | E16 Listar visitas (filtros `estado`, `tipo`, `validaEn`, `desde`, `hasta`, `q`, paginación) | Residente; guardia (solo hoy); administrador |
| `POST /visitas` | E17 Registrar visita única o frecuente | Residente |
| `GET /visitas/{id}` | E18 Consultar visita | Residente (solo las suyas); administrador |
| `PATCH /visitas/{id}` · `DELETE /visitas/{id}` | E19 Modificar · E20 Cancelar | Residente (solo las suyas) |
| `GET /codigos/{codigo}/validez` | E21 Validez de un código | Guardia |
| `POST /accesos` | E22 Registrar entrada (con código o no programada) | Guardia |
| `GET /accesos` · `GET /accesos/{id}` | E23 Historial · E24 Consultar acceso | Administrador; residente (su vivienda); guardia (hoy) |
| `POST /accesos/{id}/salida` | E25 Registrar salida | Guardia |
| `PATCH /accesos/{id}` | E26 Agregar observación | Guardia; administrador |
| `GET, POST /adeudos` · `GET, PATCH /adeudos/{id}` | E27 a E30 Adeudos | Administrador |
| `GET /parametros` · `PUT /parametros/{clave}` | E31, E32 Parámetros del reglamento | Administrador |
| `GET /health` | E33 Estado del sistema | Público |

Rutas internas (`/internal/v1`, no pasan por el gateway y exigen `X-Clave-Servicio`):

| ID | Ruta | Servicio | Quién la usa |
|---|---|---|---|
| I01 | `GET /tokens-revocados/{jti}?usuarioId=` | S1 | Gateway: ¿el token se cerró o la cuenta se desactivó? |
| I02 | `GET /usuarios/{usuarioId}` | S1 | Viviendas: ¿existe, está activo y es residente? |
| I03 | `GET /residentes/{usuarioId}/vivienda` | S2 | Visitas y Accesos: vivienda del residente |
| I04 | `POST /evaluaciones-limite` | S5 | Visitas: regla del límite por adeudo (RN03) |
| I05 | `GET /parametros/{clave}` | S5 | Accesos: tolerancia de horario |
| I06 | `GET /visitas?codigo=` | S3 | Accesos: visita de un código |
| I07 | `POST /visitas/{visitaId}/usos` | S3 | Accesos: registrar el uso del código |
| I08 | `POST /visitas` | S3 | Accesos: crear una visita no programada |
| I09 | `GET /viviendas/{viviendaId}` | S2 | Visitas y Reglas: ¿la vivienda existe y está activa? (nueva) |
| I10 | `POST /visitas/{visitaId}/anulacion` | S3 | Accesos: anular una visita no programada si la entrada falla (nueva) |

Las reglas de negocio implementadas están en `docs/reglas-negocio.md`.

Usuarios y viviendas no se borran: se desactivan con `PATCH`. Las visitas tampoco: se cancelan y quedan en el historial.

### Estructura de un servicio

```
services/viviendas/src/
├── routes/        rutas y método HTTP de cada endpoint
├── validators/    reglas de validación de cada contrato (express-validator)
├── controllers/   leen la petición validada y arman la respuesta HTTP
├── services/      reglas de negocio y traducción de errores
├── repositories/  único lugar con SQL (consultas parametrizadas con mysql2)
└── clients/       llamadas a rutas internas de otros servicios (con tiempo límite de 3 s)
```

El código común está en `shared/`: formato estándar de errores, conexión a MySQL y transacciones, permisos por rol, validación y paginación, fechas en hora de la Ciudad de México, traducción de errores de MySQL, llamadas internas con tiempo límite de 3 segundos y la ruta `/health`.

## Documentación

- Especificación de la API: `docs/api/openapi.yaml` (se puede abrir en https://editor.swagger.io).
- Documentos de cada entrega: `docs/entregas/`.
- Diagramas: `docs/diagramas/` (arquitectura, modelo de dominio, flujo de registrar una entrada y modelo entidad-relación).
- Scripts de la base de datos: `database/`.
- Colección de Postman: `docs/postman/`.
- Evidencias de ejecución de cada entrega: `docs/evidencias/`.

## Cómo trabajamos en el repositorio

1. Nadie trabaja directo en `main`. Cada tarea se hace en una rama: `git checkout -b feature/nombre-de-la-tarea`.
2. Al terminar, se sube la rama y se abre un pull request para que otro integrante lo revise.
3. Cada entrega se marca con una etiqueta: `v0.1-entrega1`, `v0.2-entrega2`, `v0.3-entrega3`, etc.
4. Nunca se suben archivos `.env` ni contraseñas reales; solo `.env.example`.

## Estado del proyecto

| Semana | Entrega | Estado |
|---|---|---|
| 1 | Propuesta del proyecto | Entregada |
| 2 | Análisis de requisitos y arquitectura | Entregada |
| 3 | Diseño de la API y contratos de servicio | Entregada |
| 4 | Modelo de datos y persistencia | Entregada |
| 5 | MVP Backend I | Entregada |
| 6 | MVP Backend II e integración | Entregada |
| 7 | Pruebas, seguridad, documentación y despliegue | Pendiente |
| 8 | Entrega final | Pendiente |
