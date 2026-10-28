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

- Node.js 24 LTS
- MySQL 8.4 (o 8.0)
- Git

## Cómo ejecutarlo

```bash
npm install          # instala las dependencias de todos los servicios
npm run setup:env    # crea los archivos .env a partir de .env.example
npm run dev          # levanta el gateway y los cinco servicios
```

Para comprobar que todo funciona, abre http://localhost:3000/api/v1/health. Debe responder `"estado": "ok"` con los cinco servicios.

Para levantar un solo servicio: `npm run dev -w services/visitas`.

### Base de datos

Los scripts están en `database/`. Para crear la base con sus datos de prueba y los usuarios de cada servicio:

```bash
mysql -u root -p < database/01_esquema.sql
mysql -u root -p < database/02_datos_prueba.sql
mysql -u root -p < database/04_usuarios_servicios.sql
```

Más detalle en `database/README.md`.

## Documentación

- Especificación de la API: `docs/api/openapi.yaml` (se puede abrir en https://editor.swagger.io).
- Documentos de cada entrega: `docs/entregas/`.
- Diagramas: `docs/diagramas/` (arquitectura, modelo de dominio, flujo de registrar una entrada y modelo entidad-relación).
- Scripts de la base de datos: `database/`.

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
| 5 | MVP Backend I | Pendiente |
| 6 | MVP Backend II e integración | Pendiente |
| 7 | Pruebas, seguridad, documentación y despliegue | Pendiente |
| 8 | Entrega final | Pendiente |
