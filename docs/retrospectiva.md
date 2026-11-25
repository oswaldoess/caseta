# Retrospectiva del equipo (Entrega 8)

> **Base para revisar en equipo.** Este documento se armó con lo que se ve en el repositorio y en los reportes de cada entrega. Antes de entregarlo, cada integrante debe revisar que diga lo que de verdad piensa y agregar o quitar lo necesario, sobre todo en la parte de aportaciones.

## Qué salió bien

- **Diseñar antes de programar.** Las entregas 2, 3 y 4 dejaron listos los requisitos, los contratos de la API y el modelo de datos. Cuando empezó el código (Entrega 5), cada servicio ya sabía qué recibir, qué responder y en qué tablas guardar. El esquema de la base de la Entrega 4 no tuvo que cambiar en ninguna entrega posterior.
- **Una sola forma de hacer las cosas.** Todos los servicios usan la misma estructura en capas y el mismo código común (`shared/`): formato de errores, permisos, validación, fechas y conexión a MySQL. Eso hizo que cualquiera pudiera leer el servicio de otro.
- **Reglas en el servidor y también en la base.** Las reglas de negocio se revisan en la API y, como última barrera, con restricciones `UNIQUE` y `CHECK` en MySQL. Gracias a eso la prueba de 10 entradas simultáneas con el mismo código solo deja pasar una.
- **Pruebas que se pueden repetir.** La colección de Postman, las pruebas con Jest y la prueba de carga se corren con un comando y no dependen de la fecha ni de datos escritos a mano.
- **Seguridad desde el diseño.** JWT, bcrypt, permisos por rol, un usuario de MySQL por servicio y secretos fuera del código estaban planeados desde la Entrega 2 y se cumplieron.

## Qué salió mal o costó trabajo

- **Repartir el trabajo en el repositorio.** La mayor parte del código quedó en pocos commits grandes por entrega, hechos por pocas personas. El historial no refleja bien lo que aportó cada integrante.
- **Fechas y zonas horarias.** MySQL y Node convertían fechas a UTC y una visita de hoy aparecía como de ayer (defecto A02). También la colección de Postman fallaba otro día porque tenía fechas fijas (A07).
- **Detalles de las herramientas.** Express 5 cambió cómo se leen los filtros (A01) y `express-validator` aplicaba mal las validaciones condicionales (A04). Se resolvieron, pero tomaron tiempo de depuración.
- **Consistencia entre servicios.** Registrar una entrada toca dos servicios con dos bases de tablas distintas. Hubo que diseñar la transacción con compensación (I07 e I10) para no dejar datos a medias.
- **Docker Compose.** El requisito RNF09 pedía levantar todo con un solo comando de Docker Compose. Se cambió por scripts de npm (`npm run db:crear` y `npm run dev`) para no sumar otra herramienta en las últimas semanas.

## Qué cambiaríamos en otro proyecto

1. Trabajar con ramas y pull requests por tarea desde la primera semana, con commits pequeños de cada integrante y revisión de otra persona antes de unir a `main`.
2. Agregar Docker Compose desde la Entrega 5, cuando todavía era fácil.
3. Escribir las pruebas al mismo tiempo que cada endpoint y no hasta la Entrega 7.
4. Definir desde el inicio que todas las fechas se manejan en una sola zona horaria y en formato de texto.
5. Hacer una revisión corta del avance cada semana con todo el equipo, para que todos conozcan el código antes de la defensa.

## Aportaciones por integrante

| Integrante | Aportaciones principales |
|---|---|
| María Fernanda Barrientos Mancilla | Entrega 4: modelo de datos, scripts SQL, pruebas de restricciones y diagrama entidad-relación. Entrega 8: integración final, evidencias, demo y documento final. *(revisar y completar)* |
| Citlaly Zamudio Pérez | *(completar)* |
| Karen Citlalli Ortiz Barajas | *(completar)* |
| Oswaldo Escobar Rangel | Estructura inicial del repositorio (Entrega 3), integración de las entregas 6 y 7. *(revisar y completar)* |
| José Emiliano Pastrana Bazaldua | Entrega 5: MVP Backend I. *(revisar y completar)* |
| Angelica Carbajal Sintora | *(completar)* |
