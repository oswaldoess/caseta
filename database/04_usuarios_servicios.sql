-- =====================================================================
-- Caseta. Entrega 4
-- 04_usuarios_servicios.sql: un usuario de MySQL por servicio
--
-- Ejecutar después de 01_esquema.sql, con una cuenta administradora
-- de MySQL (por ejemplo root).
--
-- Cada servicio se conecta con su propio usuario y solo tiene permisos
-- sobre sus tablas. Así, aunque todas las tablas viven en la base
-- `caseta`, un servicio no puede leer ni modificar los datos de otro:
-- si los necesita, los pide por la API interna.
--
-- Las contraseñas son las mismas de ejemplo que vienen en cada
-- .env.example. Sirven solo para el entorno local; en cualquier otro
-- entorno se cambian y nunca se suben al repositorio.
--
-- DELETE solo se da donde la API realmente borra filas:
-- retirar un residente, cambiar los días de una visita frecuente y
-- limpiar tokens vencidos. El historial (visitas, accesos, adeudos)
-- nunca se borra, así que esos permisos no existen.
-- =====================================================================

DROP USER IF EXISTS 'caseta_identidad'@'localhost', 'caseta_viviendas'@'localhost',
                    'caseta_visitas'@'localhost',   'caseta_accesos'@'localhost',
                    'caseta_reglas'@'localhost';

CREATE USER 'caseta_identidad'@'localhost' IDENTIFIED BY 'cambiar_esta_contrasena';
CREATE USER 'caseta_viviendas'@'localhost' IDENTIFIED BY 'cambiar_esta_contrasena';
CREATE USER 'caseta_visitas'@'localhost'   IDENTIFIED BY 'cambiar_esta_contrasena';
CREATE USER 'caseta_accesos'@'localhost'   IDENTIFIED BY 'cambiar_esta_contrasena';
CREATE USER 'caseta_reglas'@'localhost'    IDENTIFIED BY 'cambiar_esta_contrasena';

-- S1. Identidad
GRANT SELECT, INSERT, UPDATE         ON caseta.usuarios             TO 'caseta_identidad'@'localhost';
GRANT SELECT, INSERT, DELETE         ON caseta.tokens_revocados     TO 'caseta_identidad'@'localhost';

-- S2. Viviendas
GRANT SELECT, INSERT, UPDATE         ON caseta.viviendas            TO 'caseta_viviendas'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON caseta.residentes_vivienda  TO 'caseta_viviendas'@'localhost';

-- S3. Visitas
GRANT SELECT, INSERT, UPDATE         ON caseta.visitas              TO 'caseta_visitas'@'localhost';
GRANT SELECT, INSERT, DELETE         ON caseta.visita_dias          TO 'caseta_visitas'@'localhost';
GRANT SELECT, INSERT                 ON caseta.visita_usos          TO 'caseta_visitas'@'localhost';

-- S4. Accesos
GRANT SELECT, INSERT, UPDATE         ON caseta.accesos              TO 'caseta_accesos'@'localhost';
GRANT SELECT, INSERT                 ON caseta.observaciones_acceso TO 'caseta_accesos'@'localhost';

-- S5. Reglas y Adeudos
GRANT SELECT, INSERT, UPDATE         ON caseta.adeudos              TO 'caseta_reglas'@'localhost';
GRANT SELECT, UPDATE                 ON caseta.parametros           TO 'caseta_reglas'@'localhost';
