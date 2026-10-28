# Base de datos

Scripts de MySQL de la Entrega 4 (modelo de datos y persistencia). Probados en MySQL 8.0 y compatibles con MySQL 8.4.

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `01_esquema.sql` | Borra y vuelve a crear la base `caseta` con sus 11 tablas, llaves, índices y restricciones. |
| 2 | `02_datos_prueba.sql` | Inserta 67 registros ficticios. Todas las cuentas usan la contraseña de prueba `Caseta2026!` (guardada con bcrypt). |
| 3 | `03_consultas.sql` | 15 consultas de solo lectura que verifican el modelo (C01 a C15). |
| 4 | `04_usuarios_servicios.sql` | Crea un usuario de MySQL por servicio con permisos solo sobre sus tablas. Usa las contraseñas de ejemplo de los `.env.example`. |
| 5 | `05_pruebas_restricciones.sql` | 26 intentos de guardar datos inválidos. Todos deben salir como `RECHAZADA` y la base queda igual. |

## Cómo ejecutarlos

Desde la raíz del repositorio:

```bash
mysql -u root -p < database/01_esquema.sql
mysql -u root -p < database/02_datos_prueba.sql
mysql -u root -p < database/03_consultas.sql
mysql -u root -p < database/04_usuarios_servicios.sql
mysql -u root -p < database/05_pruebas_restricciones.sql
```

En MySQL Workbench: File → Open SQL Script, abrir cada archivo en orden y ejecutarlo con el botón del rayo.

Los scripts se pueden repetir desde cero las veces que sea necesario.

## Qué servicio usa cada tabla

Todas las tablas están en la base `caseta`, pero cada una tiene un solo servicio dueño. Cada servicio se conecta con su propio usuario de MySQL y no puede leer ni modificar las tablas de otro servicio.

| Servicio | Usuario de MySQL | Tablas |
|---|---|---|
| S1. Identidad | `caseta_identidad` | `usuarios`, `tokens_revocados` |
| S2. Viviendas | `caseta_viviendas` | `viviendas`, `residentes_vivienda` |
| S3. Visitas | `caseta_visitas` | `visitas`, `visita_dias`, `visita_usos` |
| S4. Accesos | `caseta_accesos` | `accesos`, `observaciones_acceso` |
| S5. Reglas y Adeudos | `caseta_reglas` | `adeudos`, `parametros` |

- Dentro de un servicio las relaciones usan `FOREIGN KEY`.
- Entre servicios no hay llaves foráneas: la tabla guarda solo el id (referencia lógica) y el servicio dueño lo valida con su ruta interna (`/internal/v1`).
- El diagrama entidad-relación está en `docs/diagramas/modelo-er.png`.
