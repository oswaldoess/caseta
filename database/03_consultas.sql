-- =====================================================================
-- Caseta. Entrega 4
-- 03_consultas.sql: consultas para verificar que el modelo funciona
--
-- Ejecutar después de 01 y 02. Solo lee datos.
-- Cada consulta indica qué endpoint o regla de la API respalda.
-- Para que los resultados no cambien según el día en que se ejecute,
-- "hoy" se fija en el martes 27 de octubre de 2026.
-- =====================================================================

SET NAMES utf8mb4;
USE caseta;

SET @hoy        = DATE('2026-10-27');
SET @ahora      = TIMESTAMP('2026-10-27 17:30:00');
SET @tolerancia = 15;  -- en la aplicación se lee de parametros (ruta interna I05)

-- ---------------------------------------------------------------------
-- C01. Registros por tabla (mínimo pedido: 10 entre las entidades principales)
-- ---------------------------------------------------------------------
SELECT 'usuarios' AS tabla, COUNT(*) AS registros FROM usuarios
UNION ALL SELECT 'tokens_revocados',     COUNT(*) FROM tokens_revocados
UNION ALL SELECT 'viviendas',            COUNT(*) FROM viviendas
UNION ALL SELECT 'residentes_vivienda',  COUNT(*) FROM residentes_vivienda
UNION ALL SELECT 'visitas',              COUNT(*) FROM visitas
UNION ALL SELECT 'visita_dias',          COUNT(*) FROM visita_dias
UNION ALL SELECT 'visita_usos',          COUNT(*) FROM visita_usos
UNION ALL SELECT 'accesos',              COUNT(*) FROM accesos
UNION ALL SELECT 'observaciones_acceso', COUNT(*) FROM observaciones_acceso
UNION ALL SELECT 'adeudos',              COUNT(*) FROM adeudos
UNION ALL SELECT 'parametros',           COUNT(*) FROM parametros;

-- ---------------------------------------------------------------------
-- C02. S1 · E01 Iniciar sesión: buscar la cuenta activa por correo.
-- El servicio compara el hash con bcrypt; la contraseña nunca viaja a SQL.
-- ---------------------------------------------------------------------
SELECT id, nombre_completo, rol, activo, LEFT(contrasena_hash, 7) AS inicio_hash
FROM usuarios
WHERE correo = 'carlos.ramirez@correo.com' AND activo = TRUE;

-- ---------------------------------------------------------------------
-- C03. S1 · I01 ¿El token fue revocado? (1 fila = revocado; 0 filas = válido)
-- ---------------------------------------------------------------------
SELECT jti, usuario_id, revocado_en
FROM tokens_revocados
WHERE jti = '7c1e9a52-4b3d-4f8e-9a61-2d5b8c0e7f14';

-- ---------------------------------------------------------------------
-- C04. S2 · I03 Vivienda y domicilio de un residente (lo usa Visitas)
-- ---------------------------------------------------------------------
SELECT r.usuario_id, v.id AS vivienda_id, CONCAT(v.calle, ' ', v.numero) AS domicilio, r.es_titular
FROM residentes_vivienda r
JOIN viviendas v ON v.id = r.vivienda_id
WHERE r.usuario_id = 6 AND v.activa = TRUE;

-- ---------------------------------------------------------------------
-- C05. S2 · E09 Listar viviendas con su total de residentes (totalResidentes)
-- ---------------------------------------------------------------------
SELECT v.id, CONCAT(v.calle, ' ', v.numero) AS domicilio, v.activa, COUNT(r.id) AS total_residentes
FROM viviendas v
LEFT JOIN residentes_vivienda r ON r.vivienda_id = v.id
GROUP BY v.id
ORDER BY v.id;

-- ---------------------------------------------------------------------
-- C06. S3 · E16 Visitas esperadas hoy (vista del guardia, validaEn = hoy).
-- Únicas del día + frecuentes vigentes cuyo día de la semana es hoy.
-- ---------------------------------------------------------------------
SELECT vi.id, vi.tipo, vi.codigo, vi.nombre_visitante, vi.numero_personas, vi.domicilio,
       TIME_FORMAT(vi.hora_inicio, '%H:%i') AS desde, TIME_FORMAT(vi.hora_fin, '%H:%i') AS hasta
FROM visitas vi
WHERE vi.estado IN ('activa', 'utilizada')
  AND @hoy BETWEEN vi.fecha_inicio AND vi.fecha_fin
  AND (vi.tipo = 'unica'
       OR (vi.tipo = 'frecuente' AND EXISTS (
             SELECT 1 FROM visita_dias d
             WHERE d.visita_id = vi.id
               AND d.dia = ELT(WEEKDAY(@hoy) + 1, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'))))
ORDER BY vi.hora_inicio;

-- ---------------------------------------------------------------------
-- C07. S3 · E21 Validez de un código: calcula valido y motivo como la API.
-- Pedro (C9VF5NJU) puede entrar los martes de 09:00 a 13:00; a las 17:30
-- su código existe pero está fuera de horario.
-- El motivo ya_dentro no sale de aquí: lo revisa Accesos en su propia tabla
-- (C11) y lo garantiza el UNIQUE uq_accesos_visita_dentro.
-- ---------------------------------------------------------------------
SET @codigo = 'C9VF5NJU';
SELECT vi.codigo, vi.tipo, vi.estado, vi.nombre_visitante, vi.domicilio,
       CASE
         WHEN vi.estado = 'cancelada' THEN 'cancelado'
         WHEN vi.estado = 'utilizada' THEN 'ya_utilizado'
         WHEN vi.estado = 'vencida' OR DATE(@ahora) > vi.fecha_fin THEN 'vencido'
         WHEN DATE(@ahora) < vi.fecha_inicio THEN 'aun_no_vigente'
         WHEN vi.tipo = 'frecuente' AND NOT EXISTS (
                SELECT 1 FROM visita_dias d WHERE d.visita_id = vi.id
                  AND d.dia = ELT(WEEKDAY(@ahora) + 1, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'))
              THEN 'dia_no_permitido'
         WHEN TIME(@ahora) NOT BETWEEN SUBTIME(vi.hora_inicio, SEC_TO_TIME(@tolerancia * 60))
                                   AND ADDTIME(vi.hora_fin, SEC_TO_TIME(@tolerancia * 60))
              THEN 'fuera_de_horario'
         ELSE NULL
       END AS motivo
FROM visitas vi
WHERE vi.codigo = @codigo;

-- Los seis casos de prueba juntos, revisados a las 10:00 del martes
SET @ahora = TIMESTAMP('2026-10-27 10:00:00');
SELECT vi.codigo, vi.estado, vi.fecha_inicio, vi.fecha_fin,
       CASE
         WHEN vi.estado = 'cancelada' THEN 'cancelado'
         WHEN vi.estado = 'utilizada' THEN 'ya_utilizado'
         WHEN vi.estado = 'vencida' OR DATE(@ahora) > vi.fecha_fin THEN 'vencido'
         WHEN DATE(@ahora) < vi.fecha_inicio THEN 'aun_no_vigente'
         WHEN vi.tipo = 'frecuente' AND NOT EXISTS (
                SELECT 1 FROM visita_dias d WHERE d.visita_id = vi.id
                  AND d.dia = ELT(WEEKDAY(@ahora) + 1, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'))
              THEN 'dia_no_permitido'
         WHEN TIME(@ahora) NOT BETWEEN SUBTIME(vi.hora_inicio, SEC_TO_TIME(@tolerancia * 60))
                                   AND ADDTIME(vi.hora_fin, SEC_TO_TIME(@tolerancia * 60))
              THEN 'fuera_de_horario'
         ELSE 'valido'
       END AS resultado
FROM visitas vi
WHERE vi.codigo IN ('C9VF5NJU', 'K7P4M2QX', 'M4TP8WZK', 'R9HX3TQW', 'B6NQ2RYD', 'H3JK9VXN')
ORDER BY resultado;

SET @ahora = TIMESTAMP('2026-10-27 17:30:00');

-- ---------------------------------------------------------------------
-- C08. RN03 / I04 Límite de personas por adeudo.
-- Parte S3: personas ya registradas por vivienda para el sábado 31.
-- Parte S5: ¿la vivienda tiene adeudo pendiente? y el límite configurado.
-- ---------------------------------------------------------------------
SELECT vivienda_id, SUM(numero_personas) AS personas_ya_registradas
FROM visitas
WHERE vivienda_id = 5 AND tipo = 'unica' AND estado <> 'cancelada'
  AND fecha_inicio = '2026-10-31'
GROUP BY vivienda_id;

SELECT 5 AS vivienda_id,
       EXISTS (SELECT 1 FROM adeudos WHERE vivienda_id = 5 AND estado = 'pendiente') AS tiene_adeudo_pendiente,
       (SELECT valor FROM parametros WHERE clave = 'limite_personas_con_adeudo')   AS limite;

-- ---------------------------------------------------------------------
-- C09. S3 · tieneEntradas: visitas que ya se usaron (no se pueden editar, RN06)
-- ---------------------------------------------------------------------
SELECT vi.id, vi.tipo, vi.nombre_visitante, COUNT(u.id) AS usos,
       COUNT(u.id) > 0 AS tiene_entradas
FROM visitas vi
LEFT JOIN visita_usos u ON u.visita_id = vi.id
GROUP BY vi.id
ORDER BY vi.id;

-- ---------------------------------------------------------------------
-- C10. S4 · E23 Historial de accesos de una vivienda, página 1, 20 por página
-- (más reciente primero), con sus observaciones unidas en un texto.
-- ---------------------------------------------------------------------
SELECT a.id, a.nombre_visitante, a.tipo_visita, a.numero_personas,
       a.entrada, a.salida, a.guardia_entrada_id, a.guardia_salida_id,
       GROUP_CONCAT(o.texto ORDER BY o.creada_en SEPARATOR ' | ') AS observaciones
FROM accesos a
LEFT JOIN observaciones_acceso o ON o.acceso_id = a.id
WHERE a.vivienda_id = 1
  AND a.entrada >= '2026-10-20' AND a.entrada < '2026-11-01'
GROUP BY a.id
ORDER BY a.entrada DESC
LIMIT 20 OFFSET 0;

SELECT COUNT(*) AS total FROM accesos WHERE vivienda_id = 1;  -- para "paginacion.total"

-- ---------------------------------------------------------------------
-- C11. S4 · E23 con dentro=true: visitas que entraron y no han salido
-- ---------------------------------------------------------------------
SELECT id, nombre_visitante, domicilio, entrada,
       TIMESTAMPDIFF(MINUTE, entrada, @ahora) AS minutos_dentro
FROM accesos
WHERE salida IS NULL;

-- ---------------------------------------------------------------------
-- C12. S4 Entradas por día y por guardia (resumen del turno)
-- ---------------------------------------------------------------------
SELECT DATE(entrada) AS dia, guardia_entrada_id, COUNT(*) AS entradas, SUM(numero_personas) AS personas
FROM accesos
GROUP BY DATE(entrada), guardia_entrada_id
ORDER BY dia, guardia_entrada_id;

-- ---------------------------------------------------------------------
-- C13. S5 · E27 Adeudos pendientes y total por vivienda
-- ---------------------------------------------------------------------
SELECT vivienda_id, COUNT(*) AS adeudos_pendientes, SUM(monto) AS total_pendiente
FROM adeudos
WHERE estado = 'pendiente'
GROUP BY vivienda_id;

-- ---------------------------------------------------------------------
-- C14. S5 · E31 Parámetros del reglamento
-- ---------------------------------------------------------------------
SELECT clave, valor, minimo, maximo, descripcion FROM parametros;

-- ---------------------------------------------------------------------
-- C15. Revisión de consistencia (solo para verificar los datos de prueba;
-- los servicios NO hacen estos JOIN entre tablas de otros servicios).
-- Cada fila cuenta referencias lógicas rotas: todas deben dar 0.
-- ---------------------------------------------------------------------
SELECT 'residentes sin usuario residente activo' AS revision, COUNT(*) AS errores
  FROM residentes_vivienda r LEFT JOIN usuarios u ON u.id = r.usuario_id AND u.rol = 'residente'
  WHERE u.id IS NULL
UNION ALL
SELECT 'visitas con vivienda inexistente', COUNT(*)
  FROM visitas vi LEFT JOIN viviendas v ON v.id = vi.vivienda_id WHERE v.id IS NULL
UNION ALL
SELECT 'visitas con residente de otra vivienda', COUNT(*)
  FROM visitas vi LEFT JOIN residentes_vivienda r ON r.usuario_id = vi.residente_id AND r.vivienda_id = vi.vivienda_id
  WHERE vi.residente_id IS NOT NULL AND r.id IS NULL
UNION ALL
SELECT 'accesos con visita inexistente', COUNT(*)
  FROM accesos a LEFT JOIN visitas vi ON vi.id = a.visita_id WHERE vi.id IS NULL
UNION ALL
SELECT 'accesos con guardia que no es guardia', COUNT(*)
  FROM accesos a LEFT JOIN usuarios u ON u.id = a.guardia_entrada_id AND u.rol = 'guardia' WHERE u.id IS NULL
UNION ALL
SELECT 'usos de código sin acceso', COUNT(*)
  FROM visita_usos us LEFT JOIN accesos a ON a.id = us.acceso_id AND a.visita_id = us.visita_id WHERE a.id IS NULL
UNION ALL
SELECT 'adeudos con vivienda inexistente', COUNT(*)
  FROM adeudos ad LEFT JOIN viviendas v ON v.id = ad.vivienda_id WHERE v.id IS NULL;
