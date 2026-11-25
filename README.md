# Caseta

Sistema de control de visitas para fraccionamientos privados. Proyecto integrador de **Arquitectura Orientada a Servicios**, Ingeniería en Software, Universidad Politécnica de Santa Rosa Jáuregui.

El residente registra a su visita con anticipación y el sistema genera un código; el guardia lo valida en la caseta y registra la entrada y la salida; la administración consulta el historial y aplica el reglamento.

**Versión final: 1.0.0 (Entrega 8).** Diagrama de arquitectura final: `docs/diagramas/arquitectura-final.png`.

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
- Postman (opcional, para probar la colección)

## Cómo ejecutarlo

Desde la raíz del repositorio, en este orden:

```bash
npm install          # 1. instala las dependencias de todos los servicios
npm run setup:env    # 2. crea los archivos .env a partir de .env.example (con secretos aleatorios)
npm run db:crear     # 3. crea la base caseta, los datos de prueba y un usuario de MySQL por servicio
npm run dev          # 4. levanta el gateway y los cinco servicios
```

- `npm run setup:env` también sirve después de un `git pull`: agrega a tus `.env` las variables nuevas sin cambiar las que ya tienes (por ejemplo, un `DB_PORT=3307`).
- `npm run db:crear` pide la contraseña de `root` de MySQL y ejecuta `01_esquema.sql`, `02_datos_prueba.sql` y `04_usuarios_servicios.sql`. Se puede repetir para dejar la base como nueva. Si prefieres la terminal de MySQL o Workbench, los mismos scripts están en `database/`.
- Para comprobar que todo funciona, abre http://localhost:3000/api/v1/health. Debe responder `"estado": "ok"` con los cinco servicios. Cada servicio revisa también su conexión a MySQL en su propio `/health` (por ejemplo http://localhost:3002/health).
- Para levantar un solo servicio: `npm run dev -w services/viviendas`.
- La documentación interactiva de la API (Swagger UI) queda en http://localhost:3000/api/docs. Desde ahí se puede iniciar sesión con **Authorize** y probar cada endpoint sin leer el código.

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

### Pruebas automatizadas (Entrega 7)

```bash
npm test                  # unidad + integración: 121 pruebas
npm run test:unidad       # solo la lógica crítica (no necesita MySQL)
npm run test:integracion  # peticiones reales al gateway; si los servicios no están corriendo, los levanta
npm run prueba:carga      # RNF04: 50 peticiones simultáneas a GET /codigos/{codigo}/validez (servicios corriendo)
```

Las pruebas de integración necesitan la base creada con `npm run db:crear` y usan las cuentas de prueba. El plan, los casos y los resultados están en `docs/pruebas.md`.

### Demo final (Entrega 8)

`docs/postman/Caseta_Demo_Final.postman_collection.json` tiene 25 peticiones en el orden de la demostración mínima: inicio de sesión, CRUD de viviendas, flujo completo de una visita, reglas de negocio, permisos, manejo de errores y persistencia. Con los servicios levantados y la base recién creada, se corre con **Run collection** o con `npx newman run docs/postman/Caseta_Demo_Final.postman_collection.json`. El guion de la demo y las respuestas para la defensa están en `docs/demo-final.md`.

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

### Seguridad

- Contraseñas con bcrypt; ninguna respuesta las devuelve.
- Los secretos (`JWT_SECRET`, `CLAVE_SERVICIO`, contraseñas de MySQL) solo viven en los `.env`, que nunca se suben. Cada servicio revisa sus variables al iniciar y, en producción, no arranca con los valores de ejemplo.
- CORS: solo los orígenes de `CORS_ORIGEN` (en `gateway/.env`, separados por coma).
- Errores con formato estándar y sin detalles internos; cuerpo máximo de 100 KB.

Lista de verificación completa: `docs/seguridad.md`. Defectos encontrados y corregidos: `docs/defectos.md`.

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

## Despliegue

El sistema son seis procesos de Node.js y una base MySQL. Para instalarlo en un servidor (o en otra computadora) sin modo de desarrollo:

1. Instalar Node.js 22 o 24 y MySQL 8, y clonar el repositorio.
2. `npm ci --omit=dev` (instala exactamente las versiones de `package-lock.json`, sin las herramientas de prueba).
3. `npm run setup:env` y editar los `.env`:
   - `NODE_ENV=production` en cada `.env`.
   - `DB_HOST`, `DB_PORT` y una contraseña propia en `DB_PASSWORD` de cada servicio; `npm run db:crear` se la asigna a su usuario de MySQL. En producción un servicio no arranca con `cambiar_esta_contrasena`.
   - `CORS_ORIGEN` con la dirección real de la aplicación cliente.
   - Si los servicios corren en otras máquinas, las `URL_*` de cada `.env`.
   - `JWT_SECRET` y `CLAVE_SERVICIO` ya quedan con valores aleatorios; deben ser iguales en todas las carpetas.
4. `npm run db:crear`. Para el primer arranque real, cambiar la contraseña de la administradora (`PUT /usuarios/me/contrasena`) y desactivar las demás cuentas de prueba (`PATCH /usuarios/{id}`). Otra opción es `SIN_DATOS_PRUEBA=1 npm run db:crear` (en PowerShell: `$env:SIN_DATOS_PRUEBA=1; npm run db:crear`), que crea la base vacía; entonces la primera administradora se inserta en MySQL con un hash bcrypt.
5. `npm start` levanta los seis procesos sin reinicio automático. Para dejarlos corriendo como servicio del sistema se puede usar `pm2` o `systemd` con el mismo comando de cada carpeta (`node src/index.js`).
6. Comprobar `GET http://<servidor>:3000/api/v1/health` (`"estado": "ok"`) y correr `npm run prueba:carga` desde una máquina de desarrollo con `URL_API=http://<servidor>:3000/api/v1`.

Solo el puerto 3000 (gateway) debe quedar abierto hacia fuera; los puertos 3001 a 3005 y MySQL solo deben aceptar conexiones de la misma red. En producción, el gateway va detrás de un proxy con HTTPS.

## Documentación

- Especificación de la API: `docs/api/openapi.yaml`, también en Swagger UI en http://localhost:3000/api/docs (con los servicios corriendo) o en https://editor.swagger.io.
- Plan y resultados de pruebas: `docs/pruebas.md`. Seguridad: `docs/seguridad.md`. Defectos: `docs/defectos.md`. Reglas de negocio: `docs/reglas-negocio.md`.
- Documentos de cada entrega: `docs/entregas/`.
- Diagramas: `docs/diagramas/` (arquitectura final, arquitectura de la Entrega 3, modelo de dominio, flujo de registrar una entrada y modelo entidad-relación).
- Scripts de la base de datos: `database/`. Respaldo completo: `database/respaldo/caseta_respaldo.sql`.
- Colecciones de Postman: `docs/postman/` (regresión completa y demo final).
- Guion de la demo y de la defensa: `docs/demo-final.md`. Retrospectiva del equipo: `docs/retrospectiva.md`.
- Evidencias de ejecución de cada entrega: `docs/evidencias/`.

## Limitaciones conocidas

- No hay interfaz gráfica: el sistema se usa por la API (Postman o Swagger UI).
- RNF09 pedía levantar todo con Docker Compose; se cambió por `npm run db:crear` y `npm run dev`.
- El límite de intentos de inicio de sesión vive en la memoria de Identidad; con varias instancias habría que moverlo a Redis.
- Sin HTTPS ni gestor de secretos en local (ver `docs/seguridad.md`).
- Los servicios comparten un mismo servidor MySQL (con un usuario por servicio), no un servidor por servicio.

## Cómo trabajamos en el repositorio

1. Nadie trabaja directo en `main`. Cada tarea se hace en una rama: `git checkout -b feature/nombre-de-la-tarea`.
2. Al terminar, se sube la rama y se integra a `main`.
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
| 7 | Pruebas, seguridad, documentación y despliegue | Entregada |
| 8 | Entrega final y defensa | Entregada (`v1.0-entrega8`) |
