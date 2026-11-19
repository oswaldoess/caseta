# Reglas de negocio implementadas (Entrega 6)

Todas las reglas se revisan en el servidor. El cliente (Postman o una futura app) no decide nada: si manda algo que rompe una regla, la API lo rechaza con el formato estándar de errores.

## Reglas del reglamento (RN)

| Regla | Qué dice | Dónde se aplica | Si no se cumple |
|---|---|---|---|
| RN01 | No hay autorregistro: solo la administración crea cuentas. | S1, `POST /usuarios` solo para administrador. | 403 `SIN_PERMISO` |
| RN02 | Solo un usuario activo con rol residente puede vivir en una vivienda; cada residente pertenece a una sola vivienda y cada vivienda tiene un solo titular. | S2 pregunta a S1 (I02); índices únicos `uq_residentes_usuario` y `uq_residentes_titular`. | 422 `REFERENCIA_INVALIDA`, 409 `RESIDENTE_YA_ASIGNADO`, 409 `TITULAR_YA_ASIGNADO` |
| RN03 | Una vivienda con adeudo pendiente solo recibe `limite_personas_con_adeudo` personas por día (10). Cuentan las visitas únicas y no programadas de ese día que no estén canceladas. | S3 cuenta las personas del día y S5 decide (I04). Se aplica al registrar o modificar una visita única y al registrar una visita no programada. | 422 `LIMITE_PERSONAS_EXCEDIDO` (indica cuántas personas quedan) |
| RN04 | Un código solo permite entrar dentro de su vigencia, en sus días (visitas frecuentes) y en su horario con la tolerancia (`tolerancia_minutos`, 15). No sirve si la visita se canceló, venció o, si es única, ya se usó. | S4 con la visita de S3 (I06) y la tolerancia de S5 (I05). | E21: 200 con `valido: false` y el motivo. E22: 422 `CODIGO_NO_VALIDO` |
| RN05 | Una visita no puede entrar otra vez si no ha salido. | S4; índice único `uq_accesos_visita_dentro` como última barrera. | 422 motivo `ya_dentro`; 409 si dos guardias lo intentan al mismo tiempo |
| RN06 | Solo se modifica o cancela una visita activa y sin entradas. | S3, E19 y E20. | 409 `VISITA_CON_ENTRADA` o 409 `CONFLICTO` |
| RN07 | Cada acceso tiene una sola salida y la hora la pone el servidor (nunca antes de la entrada). | S4, `UPDATE … WHERE salida IS NULL`; CHECK `ck_accesos_salida`. | 409 `SALIDA_YA_REGISTRADA` |
| RN08 | Un acceso no se edita: solo se le agregan observaciones. | S4, tabla `observaciones_acceso`. | No existe ruta para cambiar fechas o datos |
| RN09 | La hora de fin es posterior a la de inicio. | S3, al crear y al modificar (comparando con la hora guardada). | 400 `VALIDACION_FALLIDA` |

## Reglas de seguridad y permisos

| Regla | Dónde se aplica | Si no se cumple |
|---|---|---|
| Toda ruta, salvo `POST /sesiones` y `GET /health`, exige un token válido de 8 horas. | Gateway (firma, vigencia) e Identidad (I01: revocado o cuenta desactivada). | 401 `TOKEN_INVALIDO` o `TOKEN_EXPIRADO` |
| Cada rol solo usa sus rutas (tabla de roles de la Entrega 3). | `permitir(...)` en las rutas de cada servicio. | 403 `SIN_PERMISO` |
| El residente solo ve lo de su vivienda; la vivienda sale del token (I03), nunca del cuerpo. | S2, S3 y S4. | 404 `RECURSO_NO_ENCONTRADO`, como si no existiera |
| El guardia solo consulta las visitas válidas hoy y los accesos del día (más quien siga dentro). | S3 y S4. | 403 `SIN_PERMISO` si pide otra fecha |
| Cerrar sesión invalida el token de inmediato. | S1, tabla `tokens_revocados`. | 401 |
| Una cuenta desactivada no inicia sesión y sus tokens dejan de servir. | S1 (E01 e I01). | 401 |
| Cinco intentos fallidos de inicio de sesión por minuto (por correo e IP). | S1. | 429 `DEMASIADOS_INTENTOS` |
| Un servicio solo acepta peticiones que llegan por el gateway. | `soloDesdeGateway` en cada servicio (clave de servicio). | 401 |
| La administradora no puede desactivarse ni quitarse el rol a sí misma. | S1, E08. | 409 `CONFLICTO` |

## Otras validaciones de negocio

| Regla | Si no se cumple |
|---|---|
| Una visita única se registra de hoy a 30 días; si es para hoy, su hora de fin no puede haber pasado. | 400 |
| Una visita frecuente empieza de hoy a 30 días y dura como máximo seis meses; sus días no se repiten. | 400 |
| El tipo de visita no cambia: `fecha` solo aplica a únicas; `fechaFin` y `diasSemana`, a frecuentes. | 400 |
| El código lo genera el servidor: 8 caracteres sin I, O, 0 ni 1 para que no se confundan al dictarlo. | — |
| Una visita activa cuya fecha final ya pasó se reporta como `vencida`. | — |
| No se asignan residentes, adeudos ni visitas no programadas a una vivienda desactivada. | 409 o 422 |
| Un adeudo solo se liquida una vez. | 409 `ADEUDO_YA_LIQUIDADO` |
| Un parámetro del reglamento solo acepta valores dentro de su rango. | 400 |

## Transacciones y consistencia

| Operación | Estrategia |
|---|---|
| Registrar una entrada con código (E22) | Accesos abre una transacción, inserta el acceso y pide a Visitas registrar el uso del código (I07). Solo confirma si Visitas responde 201; si responde 409 o no responde en 3 segundos, revierte. Visitas registra el uso en su propia transacción con la fila de la visita bloqueada (`SELECT … FOR UPDATE`). |
| Registrar una visita no programada (E22) | Visitas crea la visita (I08) y Accesos registra la entrada. Si la entrada falla, Accesos pide a Visitas anularla (I10, compensación). |
| Registrar o modificar una visita frecuente | La visita y sus días (`visita_dias`) se guardan en una sola transacción. |
| Registrar una salida con observación | La salida y la observación se guardan en una sola transacción. |
| Llamadas a otros servicios | Se hacen antes de escribir. Si un servicio no responde en 3 segundos se responde 503 y no se guarda nada. |
| Cambios de estado (liquidar, salida, cancelar) | El `UPDATE` lleva la condición del estado actual (`WHERE estado = 'pendiente'`, `WHERE salida IS NULL`), así que dos peticiones al mismo tiempo no pueden aplicar el cambio dos veces. |
