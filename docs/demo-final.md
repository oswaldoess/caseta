# Guion de la demo y la defensa (Entrega 8)

## Antes de empezar (10 minutos antes)

```bash
npm install          # solo la primera vez
npm run setup:env    # solo la primera vez
npm run db:crear     # deja la base como nueva (pide la contraseña de root de MySQL)
npm run dev          # levanta el gateway y los cinco servicios
```

1. Abrir http://localhost:3000/api/v1/health y comprobar `"estado": "ok"` con los cinco servicios.
2. En Postman, importar `docs/postman/Caseta_Demo_Final.postman_collection.json`.
3. Tener abiertos: Postman, MySQL Workbench conectado a la base `caseta` y http://localhost:3000/api/docs (Swagger UI).
4. Si algo falla: `npm run db:crear` y volver a correr la colección desde el inicio.

## Demostración mínima (unos 8 minutos)

La colección está en el mismo orden que la lista del profesor. Basta con dar **Send** a cada petición. Para hacerla sin pausas: botón **Run collection**.

| Paso | Carpeta de Postman | Qué se muestra | Qué decir |
|---|---|---|---|
| 1 | 1. Inicio de sesión | `GET /health` y el inicio de sesión de los tres roles; luego una contraseña incorrecta (401). | "El token dura 8 horas y nunca regresamos la contraseña. Con contraseña incorrecta el mensaje no dice si el correo existe." |
| 2 | 2. CRUD de viviendas | Crear, consultar, modificar, buscar y dar de baja una vivienda; luego una duplicada (409). | "No borramos datos: la baja es lógica, para no perder el historial." |
| 3 | 3. Flujo principal | El residente registra una visita y recibe el código; el guardia lo valida, registra la entrada; el residente ve quién está dentro; el guardia registra la salida. | "Este flujo toca cuatro servicios: Visitas pide a Viviendas la casa del residente y a Reglas si tiene adeudo; Accesos pide a Visitas la visita del código." |
| 4 | 4. Reglas de negocio | El mismo código ya no sirve (`ya_utilizado`). Una casa con adeudo no puede recibir 20 personas (422). | "Las reglas se revisan en el servidor, nunca en el cliente." |
| 5 | 5. Control de permisos | Sin token (401), residente creando usuarios (403), residente viendo una casa ajena (404). | "Para lo ajeno respondemos 404 y no 403, para no confirmar que el recurso existe." |
| 6 | 6. Manejo de un error real | Registrar otra vez la entrada con un código usado (422) y datos inválidos (400, lista todos los campos). | "Todos los errores usan el mismo formato, con un código estable y un mensaje en español." |
| 7 | 7. Persistencia | Consultar el acceso guardado y, en Workbench, ejecutar la consulta de abajo. | "Lo que hicimos en Postman ya está en MySQL." |

Consulta para Workbench (paso 7):

```sql
SELECT id, nombre_visitante, domicilio, entrada, salida
FROM caseta.accesos ORDER BY id DESC LIMIT 5;
```

### Error extra (opcional): un servicio se cae

1. Con `npm run dev` corriendo, abrir otra PowerShell y detener solo Reglas (el proceso que usa el puerto 3005):
   ```powershell
   Get-NetTCPConnection -LocalPort 3005 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess }
   ```
2. `GET /health` responde 503 con `"reglas": "sin_respuesta"`.
3. Registrar una visita responde 503 `SERVICIO_NO_DISPONIBLE` y no guarda nada; las demás rutas siguen funcionando.
4. Para volver a levantar Reglas, en esa misma PowerShell: `npm run dev -w services/reglas`.

Evidencia ya grabada: `docs/evidencias/entrega8/servicio-caido-503.txt`.

## Si la demo es en video

1. Grabar la pantalla con la barra de juegos de Windows (`Windows + Alt + R` para iniciar y detener) o con OBS Studio.
2. Seguir la tabla de arriba, narrando lo de la columna "Qué decir". Duración sugerida: 6 a 8 minutos.
3. Mostrar al inicio la terminal con `npm run dev` corriendo y, al final, Workbench con la consulta.
4. Subir el video a Drive o YouTube (no listado) y poner el enlace en el documento final.

## Defensa técnica: respuestas cortas

| Pregunta del profesor | Respuesta |
|---|---|
| ¿Por qué eligieron esa arquitectura? | Las cinco áreas del problema (cuentas, casas, visitas, caseta y reglamento) cambian por razones distintas y tienen dueños de datos claros. Separarlas en servicios deja que cada una tenga sus tablas y sus reglas, y el gateway da un solo punto de entrada con la seguridad en un lugar. |
| ¿Cómo se comunican los componentes? | El cliente solo habla con el gateway por HTTP y JSON con un token JWT. El gateway enruta a cada servicio. Los servicios se llaman entre sí por rutas internas `/internal/v1` (I01 a I10) con una clave de servicio y un límite de 3 segundos. |
| ¿Por qué existe cada servicio? | Identidad: cuentas y tokens. Viviendas: casas y quién vive en cada una. Visitas: autorizaciones y códigos. Accesos: lo que pasa en la caseta y el historial. Reglas: adeudos y parámetros del reglamento. Cada uno es dueño de sus tablas. |
| ¿Cómo se protege un endpoint? | El gateway exige `Authorization: Bearer`, revisa la firma, la vigencia y pregunta a Identidad si el token se cerró (I01). Luego cada servicio revisa el rol con `permitir(...)` y filtra por dueño (el residente solo ve su casa). Un servicio rechaza lo que no llega por el gateway. |
| ¿Cómo se almacena la información? | En MySQL 8, base `caseta`, 11 tablas. Cada servicio entra con su propio usuario de MySQL y solo ve sus tablas. Entre servicios no hay llaves foráneas: se guarda el id y el dueño lo valida por API. Contraseñas con bcrypt. |
| ¿Qué sucede cuando ocurre un error? | Se responde con el formato estándar `{ error: { codigo, mensaje, estado, detalles, … } }`. Los errores de validación listan cada campo. Un error inesperado responde 500 genérico y el detalle solo queda en el registro del servidor. Si un servicio no responde en 3 s, se responde 503 y no se guarda nada. |
| ¿Qué cambiarían con 100 veces más usuarios? | Varias instancias de cada servicio detrás de un balanceador; mover el límite de intentos de inicio de sesión y la lista de tokens revocados a Redis; una réplica de lectura de MySQL para el historial; índices y archivado de accesos viejos; y cola de mensajes para avisos al residente. La validación de un código ya soporta unas 380 peticiones por segundo en una máquina de 2 núcleos. |
| ¿Qué mejorarían con más tiempo? | Docker Compose para levantar todo con un comando, una interfaz web para el guardia y el residente, notificaciones al residente cuando entra su visita, HTTPS y un gestor de secretos. |
