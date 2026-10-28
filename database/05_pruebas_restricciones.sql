-- =====================================================================
-- Caseta. Entrega 4
-- 05_pruebas_restricciones.sql: comprueba que la base RECHAZA datos inválidos
--
-- Ejecutar después de 01 y 02. Cada prueba intenta guardar algo que
-- rompe una regla. El procedimiento `probar` captura el error de MySQL,
-- deshace la prueba (ROLLBACK) y anota el resultado. Al final se muestra
-- una tabla: todas las filas deben decir RECHAZADA.
-- La base queda igual que antes de ejecutar el script.
-- =====================================================================

SET NAMES utf8mb4;
USE caseta;

DROP PROCEDURE IF EXISTS probar;
DROP TEMPORARY TABLE IF EXISTS resultados;
CREATE TEMPORARY TABLE resultados (
  num        INT,
  regla      VARCHAR(120),
  resultado  VARCHAR(20),
  error_num  INT,
  mensaje    VARCHAR(300)
);

DELIMITER $$
CREATE PROCEDURE probar(IN p_num INT, IN p_regla VARCHAR(120), IN p_sql TEXT)
BEGIN
  DECLARE v_errno INT DEFAULT NULL;
  DECLARE v_msg   TEXT DEFAULT NULL;
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION, SQLWARNING
    GET DIAGNOSTICS CONDITION 1 v_errno = MYSQL_ERRNO, v_msg = MESSAGE_TEXT;

  START TRANSACTION;
  SET @sql_prueba = p_sql;
  PREPARE sentencia FROM @sql_prueba;
  EXECUTE sentencia;
  DEALLOCATE PREPARE sentencia;
  ROLLBACK;

  INSERT INTO resultados
  VALUES (p_num, p_regla, IF(v_errno IS NULL, 'ACEPTADA (revisar)', 'RECHAZADA'), v_errno, LEFT(v_msg, 300));
END$$
DELIMITER ;

-- S1. Identidad -------------------------------------------------------
CALL probar(1, 'Correo único (CORREO_DUPLICADO)',
  "INSERT INTO usuarios (nombre_completo, correo, telefono, rol, contrasena_hash)
   VALUES ('Otra Persona', 'carlos.ramirez@correo.com', '4425559999', 'residente', '$2b$10$M1.QnX4HM.X7h7wPCvn1ReuJa0NRkIGI0dkpL7xI06/ScPYd3JqI2')");
CALL probar(2, 'Teléfono de 10 dígitos',
  "UPDATE usuarios SET telefono = '442555' WHERE id = 5");
CALL probar(3, 'Rol dentro del catálogo',
  "UPDATE usuarios SET rol = 'superusuario' WHERE id = 5");
CALL probar(4, 'Sin contraseñas en texto plano (RNF01)',
  "UPDATE usuarios SET contrasena_hash = 'Caseta2026!' WHERE id = 5");

-- S2. Viviendas -------------------------------------------------------
CALL probar(5, 'Calle y número únicos (VIVIENDA_DUPLICADA)',
  "INSERT INTO viviendas (calle, numero) VALUES ('Av. de los Fresnos', '214')");
CALL probar(6, 'Un residente en una sola vivienda (RESIDENTE_YA_ASIGNADO)',
  "INSERT INTO residentes_vivienda (vivienda_id, usuario_id) VALUES (2, 5)");
CALL probar(7, 'Un solo titular por vivienda',
  "UPDATE residentes_vivienda SET es_titular = TRUE WHERE usuario_id = 6");
CALL probar(8, 'La vivienda debe existir (llave foránea)',
  "INSERT INTO residentes_vivienda (vivienda_id, usuario_id) VALUES (99, 11)");

-- S3. Visitas ---------------------------------------------------------
CALL probar(9, 'Código sin O ni minúsculas',
  "UPDATE visitas SET codigo = 'k7p4m2qO' WHERE id = 5");
CALL probar(10, 'Código único',
  "UPDATE visitas SET codigo = 'K7P4M2QX' WHERE id = 5");
CALL probar(11, 'Entre 1 y 20 personas',
  "UPDATE visitas SET numero_personas = 25 WHERE id = 5");
CALL probar(12, 'horaFin posterior a horaInicio (RN09)',
  "UPDATE visitas SET hora_inicio = '23:00', hora_fin = '18:00' WHERE id = 5");
CALL probar(13, 'Visita única en un solo día',
  "UPDATE visitas SET fecha_fin = '2026-10-30' WHERE id = 5");
CALL probar(14, 'Visita programada con código',
  "UPDATE visitas SET codigo = NULL WHERE id = 5");
CALL probar(15, 'No programada con quien autorizó',
  "UPDATE visitas SET autorizado_por = NULL WHERE id = 8");
CALL probar(16, 'Un día no se repite en la misma visita',
  "INSERT INTO visita_dias (visita_id, dia) VALUES (2, 'lunes')");
CALL probar(17, 'Los días pertenecen a una visita existente',
  "INSERT INTO visita_dias (visita_id, dia) VALUES (999, 'sabado')");
CALL probar(18, 'Un acceso solo usa un código una vez',
  "INSERT INTO visita_usos (visita_id, acceso_id) VALUES (2, 4)");

-- S4. Accesos ---------------------------------------------------------
CALL probar(19, 'Una visita no entra dos veces sin salir (ya_dentro)',
  "INSERT INTO accesos (visita_id, tipo_visita, nombre_visitante, numero_personas, vivienda_id, domicilio, residente_id, guardia_entrada_id)
   VALUES (9, 'unica', 'Mariana López Ávila', 2, 1, 'Av. de los Fresnos 214', 6, 4)");
CALL probar(20, 'La salida no es antes de la entrada (RN07)',
  "UPDATE accesos SET salida = '2026-10-27 16:00:00', guardia_salida_id = 3 WHERE id = 8");
CALL probar(21, 'Toda salida tiene guardia',
  "UPDATE accesos SET salida = '2026-10-27 20:00:00' WHERE id = 8");
CALL probar(22, 'La observación pertenece a un acceso existente',
  "INSERT INTO observaciones_acceso (acceso_id, usuario_id, texto) VALUES (500, 3, 'Prueba')");

-- S5. Reglas y Adeudos ------------------------------------------------
CALL probar(23, 'Monto mayor que cero',
  "INSERT INTO adeudos (vivienda_id, concepto, periodo, monto) VALUES (3, 'Cuota de mantenimiento', '2026-11', 0)");
CALL probar(24, 'Periodo con formato AAAA-MM',
  "INSERT INTO adeudos (vivienda_id, concepto, periodo, monto) VALUES (3, 'Cuota de mantenimiento', '2026-13', 950)");
CALL probar(25, 'Liquidado siempre con fecha',
  "UPDATE adeudos SET estado = 'liquidado' WHERE id = 3");
CALL probar(26, 'Parámetro dentro de su rango',
  "UPDATE parametros SET valor = 0 WHERE clave = 'limite_personas_con_adeudo'");

-- Resultado -----------------------------------------------------------
SELECT num, regla, resultado, error_num, mensaje FROM resultados ORDER BY num;

SELECT COUNT(*) AS pruebas, SUM(resultado = 'RECHAZADA') AS rechazadas FROM resultados;

DROP PROCEDURE probar;
DROP TEMPORARY TABLE resultados;

-- ---------------------------------------------------------------------
-- Prueba de permisos (después de ejecutar 04_usuarios_servicios.sql).
-- Desde la terminal, el servicio de Visitas no puede leer la tabla de
-- Accesos ni la de Usuarios:
--   mysql -u caseta_visitas -p -e "SELECT * FROM caseta.accesos"
--   -> ERROR 1142 (42000): SELECT command denied to user 'caseta_visitas'...
-- ---------------------------------------------------------------------
