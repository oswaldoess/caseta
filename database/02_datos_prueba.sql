-- =====================================================================
-- Caseta. Entrega 4
-- 02_datos_prueba.sql: datos ficticios para probar el modelo
--
-- Ejecutar después de 01_esquema.sql (la base queda vacía al crearla).
-- Todas las cuentas usan la contraseña de prueba Caseta2026!
-- guardada como hash bcrypt (costo 10). Ningún dato es real.
-- La semana de prueba va del jueves 22 al sábado 31 de octubre de 2026.
-- =====================================================================

SET NAMES utf8mb4;
USE caseta;

-- ---------------------------------------------------------------------
-- S1. Identidad
-- ---------------------------------------------------------------------
INSERT INTO usuarios (id, nombre_completo, correo, telefono, rol, contrasena_hash, activo, creado_en) VALUES
  (1,  'Patricia Gómez Lara',      'patricia.gomez@correo.com',   '4425550001', 'administrador', '$2b$10$M1.QnX4HM.X7h7wPCvn1ReuJa0NRkIGI0dkpL7xI06/ScPYd3JqI2', TRUE,  '2026-09-01 09:00:00'),
  (2,  'Miguel Ángel Torres Ruiz', 'miguel.torres@correo.com',    '4425550002', 'guardia',       '$2b$10$BDEIF79.dOderCo9ke.efONtXnNIzMnpVK8Y/mcTIJoMrnNnbd5QG', TRUE,  '2026-09-01 09:10:00'),
  (3,  'Ricardo Núñez Olvera',     'ricardo.nunez@correo.com',    '4425550003', 'guardia',       '$2b$10$2.6pSs0HRq0OdtRHTIsOhuvAn9R7H8JdqsV0CEvVIirLgO874KhBy', TRUE,  '2026-09-01 09:12:00'),
  (4,  'Sandra Aguilar Mora',      'sandra.aguilar@correo.com',   '4425550004', 'guardia',       '$2b$10$LYtr/ChURS0BBa3CPzIc0unhjv4rc3Mw64RlXaw8CLczhZfARcum.', TRUE,  '2026-09-01 09:15:00'),
  (5,  'Carlos Ramírez Soto',      'carlos.ramirez@correo.com',   '4425550101', 'residente',     '$2b$10$42Xmfy98u1gFtp3ILGWz.u7LnGTInDvDK/VJgKOpDmSV11w4MdTGi', TRUE,  '2026-09-02 10:00:00'),
  (6,  'Ana Lucía Ramírez Vega',   'ana.ramirez@correo.com',      '4425550102', 'residente',     '$2b$10$nMY2GBFfj4bcT1OZFJw0u.GpfzmatTxIGMTQ3Yws74lIUmi8MjCD2', TRUE,  '2026-09-02 10:05:00'),
  (7,  'Fernando Ortega Silva',    'fernando.ortega@correo.com',  '4425550103', 'residente',     '$2b$10$04rTAjdiocqQNLXspneIHOIiozVSQYWEHJO0VSlH28kOVu2unQ/ea', TRUE,  '2026-09-02 10:10:00'),
  (8,  'Mónica Herrera Paz',       'monica.herrera@correo.com',   '4425550104', 'residente',     '$2b$10$ywxb8W6di/fW4OdzZqWzUOSkCwpZV5G9SyDRPvs8xNeXwHKS9xQbi', TRUE,  '2026-09-02 10:15:00'),
  (9,  'Luis Alberto Campos Rey',  'luis.campos@correo.com',      '4425550105', 'residente',     '$2b$10$1P5SFWibiKJi93ik/fE6o.dnnQClx6vtRgLOONZyycuI9KinPKTs6', TRUE,  '2026-09-02 10:20:00'),
  (10, 'Daniela Ríos Castañeda',   'daniela.rios@correo.com',     '4425550106', 'residente',     '$2b$10$5IFpqwPp0bha0WDqbiupCuwQxJa9gK2404lKAzLxP6wIKo2QoHSZ2', TRUE,  '2026-09-02 10:25:00'),
  (11, 'Jorge Medina Cruz',        'jorge.medina@correo.com',     '4425550107', 'residente',     '$2b$10$UT8P/oqanVBDrG/1P11Y.O9x6SXuJhYQljVjFibUpM2no0d8k5qJm', FALSE, '2026-09-02 10:30:00');

-- Carlos cerró sesión el lunes en la noche; ese token ya no sirve.
INSERT INTO tokens_revocados (jti, usuario_id, revocado_en, expira_en) VALUES
  ('7c1e9a52-4b3d-4f8e-9a61-2d5b8c0e7f14', 5, '2026-10-26 22:00:00', '2026-10-27 06:00:00');

-- ---------------------------------------------------------------------
-- S2. Viviendas
-- ---------------------------------------------------------------------
INSERT INTO viviendas (id, calle, numero, referencia, activa, creada_en) VALUES
  (1, 'Av. de los Fresnos', '214', 'Manzana 3, lote 12', TRUE,  '2026-09-01 11:00:00'),
  (2, 'Av. de los Fresnos', '218', 'Manzana 3, lote 14', TRUE,  '2026-09-01 11:02:00'),
  (3, 'Calle Encino',       '15',  NULL,                 TRUE,  '2026-09-01 11:04:00'),
  (4, 'Calle Encino',       '22',  NULL,                 TRUE,  '2026-09-01 11:06:00'),
  (5, 'Privada Sauce',      '7',   'Casa esquina',       TRUE,  '2026-09-01 11:08:00'),
  (6, 'Privada Sauce',      '9',   'En remodelación',    FALSE, '2026-09-01 11:10:00');

INSERT INTO residentes_vivienda (vivienda_id, usuario_id, es_titular, fecha_alta) VALUES
  (1, 5,  TRUE,  '2026-09-02'),
  (1, 6,  FALSE, '2026-09-02'),
  (2, 7,  TRUE,  '2026-09-02'),
  (3, 8,  TRUE,  '2026-09-02'),
  (4, 9,  TRUE,  '2026-09-02'),
  (5, 10, TRUE,  '2026-09-02');

-- ---------------------------------------------------------------------
-- S3. Visitas
-- ---------------------------------------------------------------------
INSERT INTO visitas (id, tipo, estado, codigo, vivienda_id, domicilio, residente_id, nombre_visitante, placas,
                     numero_personas, fecha_inicio, fecha_fin, hora_inicio, hora_fin, autorizado_por, creada_en) VALUES
  (1,  'unica',         'utilizada', 'K7P4M2QX', 1, 'Av. de los Fresnos 214', 5,    'Laura Méndez Ríos',      'UMR-482-B', 6, '2026-10-24', '2026-10-24', '18:00', '23:00', NULL, '2026-10-21 16:40:12'),
  (2,  'frecuente',     'activa',    'R9HX3TQW', 1, 'Av. de los Fresnos 214', 5,    'Rosa Hernández Gil',     NULL,        1, '2026-10-26', '2027-03-31', '08:00', '15:00', NULL, '2026-10-21 16:45:00'),
  (3,  'unica',         'cancelada', 'M4TP8WZK', 2, 'Av. de los Fresnos 218', 7,    'Héctor Ortega Luna',     NULL,        4, '2026-10-25', '2026-10-25', '14:00', '20:00', NULL, '2026-10-22 12:00:00'),
  (4,  'unica',         'vencida',   'H3JK9VXN', 3, 'Calle Encino 15',        8,    'Paola Sánchez Ibarra',   NULL,        2, '2026-10-22', '2026-10-22', '10:00', '13:00', NULL, '2026-10-20 18:30:00'),
  (5,  'unica',         'activa',    'B6NQ2RYD', 3, 'Calle Encino 15',        8,    'Juan Pérez Morales',     'UTR-337-A', 1, '2026-10-28', '2026-10-28', '09:00', '12:00', NULL, '2026-10-26 20:10:00'),
  (6,  'frecuente',     'activa',    'T8WE4MPC', 4, 'Calle Encino 22',        9,    'Guadalupe Rivas Soto',   NULL,        1, '2026-09-07', '2027-02-26', '07:00', '14:00', NULL, '2026-09-05 09:00:00'),
  (7,  'unica',         'utilizada', 'Z5KD7HQA', 5, 'Privada Sauce 7',        10,   'Andrea Fuentes Mejía',   'UVW-905-C', 3, '2026-10-26', '2026-10-26', '19:00', '23:30', NULL, '2026-10-25 11:00:00'),
  (8,  'no_programada', 'utilizada', NULL,       2, 'Av. de los Fresnos 218', NULL, 'Jorge Salas Peña',       'UQX-118-A', 1, '2026-10-26', '2026-10-26', NULL,    NULL,    'Fernando Ortega Silva', '2026-10-26 19:24:30'),
  (9,  'unica',         'utilizada', 'P2XG6LTE', 1, 'Av. de los Fresnos 214', 6,    'Mariana López Ávila',    NULL,        2, '2026-10-27', '2026-10-27', '17:00', '21:00', NULL, '2026-10-27 08:15:00'),
  (10, 'unica',         'activa',    'W7RM3BHS', 5, 'Privada Sauce 7',        10,   'Sofía Navarro Gil',      NULL,        8, '2026-10-31', '2026-10-31', '16:00', '22:00', NULL, '2026-10-27 10:00:00'),
  (11, 'frecuente',     'activa',    'C9VF5NJU', 2, 'Av. de los Fresnos 218', 7,    'Pedro Lugo Arias',       NULL,        1, '2026-10-06', '2026-12-29', '09:00', '13:00', NULL, '2026-10-05 17:00:00');

-- Días de las visitas frecuentes
INSERT INTO visita_dias (visita_id, dia) VALUES
  (2, 'lunes'), (2, 'jueves'),
  (6, 'lunes'), (6, 'miercoles'), (6, 'viernes'),
  (11, 'martes');

-- ---------------------------------------------------------------------
-- S4. Accesos (orden cronológico)
-- ---------------------------------------------------------------------
INSERT INTO accesos (id, visita_id, tipo_visita, nombre_visitante, numero_personas, vivienda_id, domicilio, residente_id,
                     entrada, guardia_entrada_id, salida, guardia_salida_id) VALUES
  (1, 6,  'frecuente',     'Guadalupe Rivas Soto', 1, 4, 'Calle Encino 22',        9,    '2026-10-23 07:02:10', 2, '2026-10-23 13:58:40', 2),
  (2, 1,  'unica',         'Laura Méndez Ríos',    6, 1, 'Av. de los Fresnos 214', 5,    '2026-10-24 18:07:12', 3, '2026-10-24 22:41:03', 3),
  (3, 6,  'frecuente',     'Guadalupe Rivas Soto', 1, 4, 'Calle Encino 22',        9,    '2026-10-26 07:05:33', 2, '2026-10-26 13:50:02', 2),
  (4, 2,  'frecuente',     'Rosa Hernández Gil',   1, 1, 'Av. de los Fresnos 214', 5,    '2026-10-26 08:12:45', 2, '2026-10-26 14:30:18', 2),
  (5, 7,  'unica',         'Andrea Fuentes Mejía', 3, 5, 'Privada Sauce 7',        10,   '2026-10-26 19:22:05', 3, '2026-10-26 23:10:47', 3),
  (6, 8,  'no_programada', 'Jorge Salas Peña',     1, 2, 'Av. de los Fresnos 218', NULL, '2026-10-26 19:25:00', 3, '2026-10-26 20:05:31', 3),
  (7, 11, 'frecuente',     'Pedro Lugo Arias',     1, 2, 'Av. de los Fresnos 218', 7,    '2026-10-27 09:03:20', 2, '2026-10-27 12:55:09', 2),
  (8, 9,  'unica',         'Mariana López Ávila',  2, 1, 'Av. de los Fresnos 214', 6,    '2026-10-27 17:15:42', 3, NULL,                  NULL);

-- Cada entrada con código deja un uso en S3 (ruta interna I07).
-- La visita no programada (8) también se registra para saber que ya tuvo entrada.
INSERT INTO visita_usos (visita_id, acceso_id, usado_en) VALUES
  (6,  1, '2026-10-23 07:02:10'),
  (1,  2, '2026-10-24 18:07:12'),
  (6,  3, '2026-10-26 07:05:33'),
  (2,  4, '2026-10-26 08:12:45'),
  (7,  5, '2026-10-26 19:22:05'),
  (8,  6, '2026-10-26 19:25:00'),
  (11, 7, '2026-10-27 09:03:20'),
  (9,  8, '2026-10-27 17:15:42');

INSERT INTO observaciones_acceso (acceso_id, usuario_id, texto, creada_en) VALUES
  (2, 3, 'Salió acompañada del residente.',                     '2026-10-24 22:41:03'),
  (6, 3, 'El residente autorizó por teléfono a las 19:20.',     '2026-10-26 19:25:00'),
  (5, 1, 'Se revisó el registro por una queja de ruido.',       '2026-10-27 10:30:00');

-- ---------------------------------------------------------------------
-- S5. Reglas y adeudos
-- ---------------------------------------------------------------------
INSERT INTO adeudos (vivienda_id, concepto, periodo, monto, estado, registrado_en, liquidado_en) VALUES
  (1, 'Cuota de mantenimiento', '2026-09', 950.00, 'liquidado', '2026-09-01 09:00:00', '2026-09-08 12:20:00'),
  (2, 'Cuota de mantenimiento', '2026-09', 950.00, 'liquidado', '2026-09-01 09:00:00', '2026-09-15 17:45:00'),
  (2, 'Cuota de mantenimiento', '2026-10', 950.00, 'pendiente', '2026-10-01 09:00:00', NULL),
  (5, 'Cuota de mantenimiento', '2026-10', 950.00, 'pendiente', '2026-10-01 09:00:00', NULL),
  (4, 'Multa por ruido',        '2026-10', 500.00, 'liquidado', '2026-10-12 10:00:00', '2026-10-14 11:15:00');

INSERT INTO parametros (clave, valor, descripcion, minimo, maximo, actualizado_por) VALUES
  ('limite_personas_con_adeudo', 10, 'Personas que puede recibir por día una vivienda con adeudo pendiente (RN03).', 1, 50, 1),
  ('tolerancia_minutos',         15, 'Minutos antes y después del horario en que el código sigue siendo válido.', 0, 60, 1);
