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
| API Gateway | `gateway/` | 3000 | Punto único de entrada, enrutamiento, CORS, estado del sistema |
| S1. Identidad | `services/identidad/` | 3001 | Usuarios, roles, sesiones y tokens |
| S2. Viviendas | `services/viviendas/` | 3002 | Viviendas y asignación de residentes |
| S3. Visitas | `services/visitas/` | 3003 | Visitas y códigos de acceso |
| S4. Accesos | `services/accesos/` | 3004 | Validación de códigos, entradas, salidas e historial |
| S5. Reglas y Adeudos | `services/reglas/` | 3005 | Adeudos y parámetros del reglamento |

Cada servicio sigue la misma estructura: `src/routes`, `src/controllers`, `src/services`, `src/repositories` y `src/middlewares`. El código común (formato estándar de errores) está en `shared/`.

## Requisitos

- Node.js 24 LTS (también funciona con Node.js 22)
- MySQL 8.0 u 8.4 corriendo en `localhost:3306`
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

- `npm run db:crear` pide la contraseña de `root` de MySQL y ejecuta `01_esquema.sql`, `02_datos_prueba.sql` y `04_usuarios_servicios.sql`. Se puede repetir para dejar la base como nueva. Si prefieres la terminal de MySQL o Workbench, los mismos scripts están en `database/`.
- Para comprobar que todo funciona, abre http://localhost:3000/api/v1/health. Debe responder `"estado": "ok"` con los cinco servicios. Cada servicio revisa también su conexión a MySQL en su propio `/health` (por ejemplo http://localhost:3002/health).
- Para levantar un solo servicio: `npm run dev -w services/viviendas`.

Si un servicio no conecta a MySQL, revisa que `DB_USER` y `DB_PASSWORD` de su `.env` coincidan con los de `database/04_usuarios_servicios.sql`.

### Probar con Postman

1. Importa `docs/postman/Caseta_Entrega5.postman_collection.json` (Import → File).
2. Con los servicios levantados, abre la colección y usa **Run collection**. Las 37 peticiones tienen pruebas automáticas (84 verificaciones).
3. La colección se puede correr varias veces sin reiniciar la base: cada corrida crea un correo y un domicilio nuevos.

También se puede correr desde la terminal: `npx newman run docs/postman/Caseta_Entrega5.postman_collection.json`.

### Qué está implementado (Entrega 5)

Todas las rutas se consumen por el gateway en `http://localhost:3000/api/v1`.

| Endpoint | Operación | Servicio |
|---|---|---|
| `GET /usuarios` | E05 Listar usuarios (filtros `rol`, `activo`, `q`, paginación) | S1 |
| `POST /usuarios` | E06 Crear usuario (contraseña con bcrypt) | S1 |
| `GET /usuarios/{usuarioId}` | E07 Consultar usuario | S1 |
| `PATCH /usuarios/{usuarioId}` | E08 Actualizar o desactivar usuario | S1 |
| `GET /viviendas` | E09 Listar viviendas (filtros `activa`, `q`, paginación) | S2 |
| `POST /viviendas` | E10 Registrar vivienda | S2 |
| `GET /viviendas/{viviendaId}` | E11 Consultar vivienda | S2 |
| `PATCH /viviendas/{viviendaId}` | E12 Actualizar o desactivar vivienda | S2 |
| `GET /viviendas/{viviendaId}/residentes` | E13 Listar residentes | S2 → S1 |
| `POST /viviendas/{viviendaId}/residentes` | E14 Asignar residente | S2 → S1 |
| `DELETE /viviendas/{viviendaId}/residentes/{usuarioId}` | E15 Retirar residente | S2 |
| `GET /health` | E33 Estado del sistema | Gateway |

Ruta interna nueva: `GET /internal/v1/usuarios/{usuarioId}` (I02) en S1, protegida con `X-Clave-Servicio`; no se publica en el gateway.

Usuarios y viviendas no se borran: se desactivan con `PATCH` (`activo: false` / `activa: false`), como se definió en la Entrega 3. El borrado físico existe solo donde el diseño lo indica (retirar un residente).

La autenticación con JWT y los permisos por rol se agregan en la Entrega 6; por ahora las rutas no piden token.

### Estructura de un servicio

```
services/viviendas/src/
├── routes/        rutas y método HTTP de cada endpoint
├── validators/    reglas de validación de cada contrato (express-validator)
├── controllers/   leen la petición validada y arman la respuesta HTTP
├── services/      reglas de negocio y traducción de errores
├── repositories/  único lugar con SQL (consultas parametrizadas con mysql2)
└── clients/       llamadas a rutas internas de otros servicios
```

El código común está en `shared/`: formato estándar de errores, conexión a MySQL, validación y paginación, traducción de errores de MySQL, llamadas internas con tiempo límite de 3 segundos y la ruta `/health`.

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
| 6 | MVP Backend II e integración | Pendiente |
| 7 | Pruebas, seguridad, documentación y despliegue | Pendiente |
| 8 | Entrega final | Pendiente |
