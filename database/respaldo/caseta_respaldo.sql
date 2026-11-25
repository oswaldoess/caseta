-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: caseta
-- ------------------------------------------------------
-- Server version	8.0.46-0ubuntu0.24.04.4

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `caseta`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `caseta` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `caseta`;

--
-- Table structure for table `accesos`
--

DROP TABLE IF EXISTS `accesos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accesos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `visita_id` int unsigned NOT NULL COMMENT 'Referencia lógica a S3.visitas',
  `tipo_visita` enum('unica','frecuente','no_programada') NOT NULL COMMENT 'Copia',
  `nombre_visitante` varchar(120) NOT NULL COMMENT 'Copia',
  `numero_personas` tinyint unsigned NOT NULL COMMENT 'Copia',
  `vivienda_id` int unsigned NOT NULL COMMENT 'Referencia lógica a S2.viviendas',
  `domicilio` varchar(140) NOT NULL COMMENT 'Copia',
  `residente_id` int unsigned DEFAULT NULL COMMENT 'Referencia lógica a S1.usuarios',
  `entrada` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `guardia_entrada_id` int unsigned NOT NULL COMMENT 'Referencia lógica a S1.usuarios (guardia)',
  `salida` datetime DEFAULT NULL,
  `guardia_salida_id` int unsigned DEFAULT NULL COMMENT 'Referencia lógica a S1.usuarios (guardia)',
  `visita_dentro` int unsigned GENERATED ALWAYS AS (if((`salida` is null),`visita_id`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accesos_visita_dentro` (`visita_dentro`),
  KEY `ix_accesos_entrada` (`entrada`),
  KEY `ix_accesos_vivienda_entrada` (`vivienda_id`,`entrada`),
  KEY `ix_accesos_visita` (`visita_id`),
  CONSTRAINT `ck_accesos_guardia_salida` CHECK (((`salida` is null) = (`guardia_salida_id` is null))),
  CONSTRAINT `ck_accesos_personas` CHECK ((`numero_personas` between 1 and 20)),
  CONSTRAINT `ck_accesos_salida` CHECK (((`salida` is null) or (`salida` >= `entrada`)))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='S4. Registro de entrada y salida de cada visita';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accesos`
--

LOCK TABLES `accesos` WRITE;
/*!40000 ALTER TABLE `accesos` DISABLE KEYS */;
INSERT INTO `accesos` (`id`, `visita_id`, `tipo_visita`, `nombre_visitante`, `numero_personas`, `vivienda_id`, `domicilio`, `residente_id`, `entrada`, `guardia_entrada_id`, `salida`, `guardia_salida_id`) VALUES (1,6,'frecuente','Guadalupe Rivas Soto',1,4,'Calle Encino 22',9,'2026-10-23 07:02:10',2,'2026-10-23 13:58:40',2),(2,1,'unica','Laura Méndez Ríos',6,1,'Av. de los Fresnos 214',5,'2026-10-24 18:07:12',3,'2026-10-24 22:41:03',3),(3,6,'frecuente','Guadalupe Rivas Soto',1,4,'Calle Encino 22',9,'2026-10-26 07:05:33',2,'2026-10-26 13:50:02',2),(4,2,'frecuente','Rosa Hernández Gil',1,1,'Av. de los Fresnos 214',5,'2026-10-26 08:12:45',2,'2026-10-26 14:30:18',2),(5,7,'unica','Andrea Fuentes Mejía',3,5,'Privada Sauce 7',10,'2026-10-26 19:22:05',3,'2026-10-26 23:10:47',3),(6,8,'no_programada','Jorge Salas Peña',1,2,'Av. de los Fresnos 218',NULL,'2026-10-26 19:25:00',3,'2026-10-26 20:05:31',3),(7,11,'frecuente','Pedro Lugo Arias',1,2,'Av. de los Fresnos 218',7,'2026-10-27 09:03:20',2,'2026-10-27 12:55:09',2),(8,9,'unica','Mariana López Ávila',2,1,'Av. de los Fresnos 214',6,'2026-10-27 17:15:42',3,NULL,NULL);
/*!40000 ALTER TABLE `accesos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `adeudos`
--

DROP TABLE IF EXISTS `adeudos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adeudos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `vivienda_id` int unsigned NOT NULL COMMENT 'Referencia lógica a S2.viviendas',
  `concepto` varchar(80) NOT NULL,
  `periodo` char(7) NOT NULL COMMENT 'AAAA-MM',
  `monto` decimal(10,2) NOT NULL,
  `estado` enum('pendiente','liquidado') NOT NULL DEFAULT 'pendiente',
  `registrado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `liquidado_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_adeudos_vivienda_estado` (`vivienda_id`,`estado`),
  CONSTRAINT `ck_adeudos_fechas` CHECK (((`liquidado_en` is null) or (`liquidado_en` >= `registrado_en`))),
  CONSTRAINT `ck_adeudos_liquidado` CHECK (((`estado` = _utf8mb4'liquidado') = (`liquidado_en` is not null))),
  CONSTRAINT `ck_adeudos_monto` CHECK ((`monto` > 0)),
  CONSTRAINT `ck_adeudos_periodo` CHECK (regexp_like(`periodo`,_utf8mb4'^[0-9]{4}-(0[1-9]|1[0-2])$'))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='S5. Cuotas de mantenimiento por vivienda';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adeudos`
--

LOCK TABLES `adeudos` WRITE;
/*!40000 ALTER TABLE `adeudos` DISABLE KEYS */;
INSERT INTO `adeudos` VALUES (1,1,'Cuota de mantenimiento','2026-09',950.00,'liquidado','2026-09-01 09:00:00','2026-09-08 12:20:00'),(2,2,'Cuota de mantenimiento','2026-09',950.00,'liquidado','2026-09-01 09:00:00','2026-09-15 17:45:00'),(3,2,'Cuota de mantenimiento','2026-10',950.00,'pendiente','2026-10-01 09:00:00',NULL),(4,5,'Cuota de mantenimiento','2026-10',950.00,'pendiente','2026-10-01 09:00:00',NULL),(5,4,'Multa por ruido','2026-10',500.00,'liquidado','2026-10-12 10:00:00','2026-10-14 11:15:00');
/*!40000 ALTER TABLE `adeudos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `observaciones_acceso`
--

DROP TABLE IF EXISTS `observaciones_acceso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `observaciones_acceso` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `acceso_id` int unsigned NOT NULL,
  `usuario_id` int unsigned NOT NULL COMMENT 'Referencia lógica a S1.usuarios (guardia o administrador)',
  `texto` varchar(250) NOT NULL,
  `creada_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_observaciones_acceso` (`acceso_id`),
  CONSTRAINT `fk_observaciones_acceso` FOREIGN KEY (`acceso_id`) REFERENCES `accesos` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `ck_observaciones_texto` CHECK ((char_length(trim(`texto`)) > 0))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='S4. Observaciones que se agregan a un acceso (RN08)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `observaciones_acceso`
--

LOCK TABLES `observaciones_acceso` WRITE;
/*!40000 ALTER TABLE `observaciones_acceso` DISABLE KEYS */;
INSERT INTO `observaciones_acceso` VALUES (1,2,3,'Salió acompañada del residente.','2026-10-24 22:41:03'),(2,6,3,'El residente autorizó por teléfono a las 19:20.','2026-10-26 19:25:00'),(3,5,1,'Se revisó el registro por una queja de ruido.','2026-10-27 10:30:00');
/*!40000 ALTER TABLE `observaciones_acceso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parametros`
--

DROP TABLE IF EXISTS `parametros`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parametros` (
  `clave` varchar(40) NOT NULL,
  `valor` int NOT NULL,
  `descripcion` varchar(200) NOT NULL,
  `minimo` int NOT NULL,
  `maximo` int NOT NULL,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `actualizado_por` int unsigned DEFAULT NULL COMMENT 'Referencia lógica a S1.usuarios (administrador)',
  PRIMARY KEY (`clave`),
  CONSTRAINT `ck_parametros_clave` CHECK (regexp_like(`clave`,_utf8mb4'^[a-z_]+$',_utf8mb4'c')),
  CONSTRAINT `ck_parametros_rango` CHECK ((`minimo` <= `maximo`)),
  CONSTRAINT `ck_parametros_valor` CHECK ((`valor` between `minimo` and `maximo`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='S5. Valores configurables del reglamento';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parametros`
--

LOCK TABLES `parametros` WRITE;
/*!40000 ALTER TABLE `parametros` DISABLE KEYS */;
INSERT INTO `parametros` VALUES ('limite_personas_con_adeudo',10,'Personas que puede recibir por día una vivienda con adeudo pendiente (RN03).',1,50,'2026-11-25 12:46:45',1),('tolerancia_minutos',15,'Minutos antes y después del horario en que el código sigue siendo válido.',0,60,'2026-11-25 12:46:45',1);
/*!40000 ALTER TABLE `parametros` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `residentes_vivienda`
--

DROP TABLE IF EXISTS `residentes_vivienda`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `residentes_vivienda` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `vivienda_id` int unsigned NOT NULL,
  `usuario_id` int unsigned NOT NULL COMMENT 'Referencia lógica a S1.usuarios (rol residente)',
  `es_titular` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_alta` date NOT NULL DEFAULT (curdate()),
  `titular_de` int unsigned GENERATED ALWAYS AS (if(`es_titular`,`vivienda_id`,NULL)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_residentes_usuario` (`usuario_id`),
  UNIQUE KEY `uq_residentes_titular` (`titular_de`),
  KEY `fk_residentes_vivienda` (`vivienda_id`),
  CONSTRAINT `fk_residentes_vivienda` FOREIGN KEY (`vivienda_id`) REFERENCES `viviendas` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='S2. Qué residente vive en qué vivienda';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `residentes_vivienda`
--

LOCK TABLES `residentes_vivienda` WRITE;
/*!40000 ALTER TABLE `residentes_vivienda` DISABLE KEYS */;
INSERT INTO `residentes_vivienda` (`id`, `vivienda_id`, `usuario_id`, `es_titular`, `fecha_alta`) VALUES (1,1,5,1,'2026-09-02'),(2,1,6,0,'2026-09-02'),(3,2,7,1,'2026-09-02'),(4,3,8,1,'2026-09-02'),(5,4,9,1,'2026-09-02'),(6,5,10,1,'2026-09-02');
/*!40000 ALTER TABLE `residentes_vivienda` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tokens_revocados`
--

DROP TABLE IF EXISTS `tokens_revocados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens_revocados` (
  `jti` char(36) NOT NULL COMMENT 'Identificador único del JWT',
  `usuario_id` int unsigned NOT NULL,
  `revocado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expira_en` datetime NOT NULL COMMENT 'Después de esta fecha el registro se puede borrar',
  PRIMARY KEY (`jti`),
  KEY `fk_tokens_usuario` (`usuario_id`),
  KEY `ix_tokens_expira` (`expira_en`),
  CONSTRAINT `fk_tokens_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ck_tokens_expira` CHECK ((`expira_en` > `revocado_en`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='S1. Tokens cerrados con DELETE /sesiones/actual (I01)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tokens_revocados`
--

LOCK TABLES `tokens_revocados` WRITE;
/*!40000 ALTER TABLE `tokens_revocados` DISABLE KEYS */;
INSERT INTO `tokens_revocados` VALUES ('7c1e9a52-4b3d-4f8e-9a61-2d5b8c0e7f14',5,'2026-10-26 22:00:00','2026-10-27 06:00:00');
/*!40000 ALTER TABLE `tokens_revocados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(120) NOT NULL,
  `correo` varchar(160) NOT NULL,
  `telefono` char(10) NOT NULL,
  `rol` enum('residente','guardia','administrador') NOT NULL,
  `contrasena_hash` char(60) NOT NULL COMMENT 'Hash bcrypt; nunca la contraseña en texto plano (RNF01)',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuarios_correo` (`correo`),
  CONSTRAINT `ck_usuarios_correo` CHECK ((`correo` like _utf8mb4'_%@_%._%')),
  CONSTRAINT `ck_usuarios_hash` CHECK ((`contrasena_hash` like _utf8mb4'$2_$%')),
  CONSTRAINT `ck_usuarios_nombre` CHECK ((char_length(`nombre_completo`) >= 3)),
  CONSTRAINT `ck_usuarios_telefono` CHECK (regexp_like(`telefono`,_utf8mb4'^[0-9]{10}$'))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='S1. Cuentas del sistema';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Patricia Gómez Lara','patricia.gomez@correo.com','4425550001','administrador','$2b$10$M1.QnX4HM.X7h7wPCvn1ReuJa0NRkIGI0dkpL7xI06/ScPYd3JqI2',1,'2026-09-01 09:00:00','2026-11-25 12:46:45'),(2,'Miguel Ángel Torres Ruiz','miguel.torres@correo.com','4425550002','guardia','$2b$10$BDEIF79.dOderCo9ke.efONtXnNIzMnpVK8Y/mcTIJoMrnNnbd5QG',1,'2026-09-01 09:10:00','2026-11-25 12:46:45'),(3,'Ricardo Núñez Olvera','ricardo.nunez@correo.com','4425550003','guardia','$2b$10$2.6pSs0HRq0OdtRHTIsOhuvAn9R7H8JdqsV0CEvVIirLgO874KhBy',1,'2026-09-01 09:12:00','2026-11-25 12:46:45'),(4,'Sandra Aguilar Mora','sandra.aguilar@correo.com','4425550004','guardia','$2b$10$LYtr/ChURS0BBa3CPzIc0unhjv4rc3Mw64RlXaw8CLczhZfARcum.',1,'2026-09-01 09:15:00','2026-11-25 12:46:45'),(5,'Carlos Ramírez Soto','carlos.ramirez@correo.com','4425550101','residente','$2b$10$42Xmfy98u1gFtp3ILGWz.u7LnGTInDvDK/VJgKOpDmSV11w4MdTGi',1,'2026-09-02 10:00:00','2026-11-25 12:46:45'),(6,'Ana Lucía Ramírez Vega','ana.ramirez@correo.com','4425550102','residente','$2b$10$nMY2GBFfj4bcT1OZFJw0u.GpfzmatTxIGMTQ3Yws74lIUmi8MjCD2',1,'2026-09-02 10:05:00','2026-11-25 12:46:45'),(7,'Fernando Ortega Silva','fernando.ortega@correo.com','4425550103','residente','$2b$10$04rTAjdiocqQNLXspneIHOIiozVSQYWEHJO0VSlH28kOVu2unQ/ea',1,'2026-09-02 10:10:00','2026-11-25 12:46:45'),(8,'Mónica Herrera Paz','monica.herrera@correo.com','4425550104','residente','$2b$10$ywxb8W6di/fW4OdzZqWzUOSkCwpZV5G9SyDRPvs8xNeXwHKS9xQbi',1,'2026-09-02 10:15:00','2026-11-25 12:46:45'),(9,'Luis Alberto Campos Rey','luis.campos@correo.com','4425550105','residente','$2b$10$1P5SFWibiKJi93ik/fE6o.dnnQClx6vtRgLOONZyycuI9KinPKTs6',1,'2026-09-02 10:20:00','2026-11-25 12:46:45'),(10,'Daniela Ríos Castañeda','daniela.rios@correo.com','4425550106','residente','$2b$10$5IFpqwPp0bha0WDqbiupCuwQxJa9gK2404lKAzLxP6wIKo2QoHSZ2',1,'2026-09-02 10:25:00','2026-11-25 12:46:45'),(11,'Jorge Medina Cruz','jorge.medina@correo.com','4425550107','residente','$2b$10$UT8P/oqanVBDrG/1P11Y.O9x6SXuJhYQljVjFibUpM2no0d8k5qJm',0,'2026-09-02 10:30:00','2026-11-25 12:46:45');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `visita_dias`
--

DROP TABLE IF EXISTS `visita_dias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visita_dias` (
  `visita_id` int unsigned NOT NULL,
  `dia` enum('lunes','martes','miercoles','jueves','viernes','sabado','domingo') NOT NULL,
  PRIMARY KEY (`visita_id`,`dia`),
  CONSTRAINT `fk_visita_dias_visita` FOREIGN KEY (`visita_id`) REFERENCES `visitas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='S3. Días válidos de una visita frecuente (diasSemana)';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `visita_dias`
--

LOCK TABLES `visita_dias` WRITE;
/*!40000 ALTER TABLE `visita_dias` DISABLE KEYS */;
INSERT INTO `visita_dias` VALUES (2,'lunes'),(2,'jueves'),(6,'lunes'),(6,'miercoles'),(6,'viernes'),(11,'martes');
/*!40000 ALTER TABLE `visita_dias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `visita_usos`
--

DROP TABLE IF EXISTS `visita_usos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visita_usos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `visita_id` int unsigned NOT NULL,
  `acceso_id` int unsigned NOT NULL COMMENT 'Referencia lógica a S4.accesos',
  `usado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_visita_usos_acceso` (`acceso_id`),
  KEY `fk_visita_usos_visita` (`visita_id`),
  CONSTRAINT `fk_visita_usos_visita` FOREIGN KEY (`visita_id`) REFERENCES `visitas` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='S3. Cada vez que se usó un código (I07); da tieneEntradas';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `visita_usos`
--

LOCK TABLES `visita_usos` WRITE;
/*!40000 ALTER TABLE `visita_usos` DISABLE KEYS */;
INSERT INTO `visita_usos` VALUES (1,6,1,'2026-10-23 07:02:10'),(2,1,2,'2026-10-24 18:07:12'),(3,6,3,'2026-10-26 07:05:33'),(4,2,4,'2026-10-26 08:12:45'),(5,7,5,'2026-10-26 19:22:05'),(6,8,6,'2026-10-26 19:25:00'),(7,11,7,'2026-10-27 09:03:20'),(8,9,8,'2026-10-27 17:15:42');
/*!40000 ALTER TABLE `visita_usos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `visitas`
--

DROP TABLE IF EXISTS `visitas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visitas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tipo` enum('unica','frecuente','no_programada') NOT NULL,
  `estado` enum('activa','cancelada','utilizada','vencida') NOT NULL DEFAULT 'activa',
  `codigo` char(8) DEFAULT NULL COMMENT 'NULL solo en visitas no programadas',
  `vivienda_id` int unsigned NOT NULL COMMENT 'Referencia lógica a S2.viviendas',
  `domicilio` varchar(140) NOT NULL COMMENT 'Copia del domicilio para la caseta',
  `residente_id` int unsigned DEFAULT NULL COMMENT 'Referencia lógica a S1.usuarios; NULL en no programadas',
  `nombre_visitante` varchar(120) NOT NULL,
  `placas` varchar(12) DEFAULT NULL,
  `numero_personas` tinyint unsigned NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  `autorizado_por` varchar(120) DEFAULT NULL COMMENT 'Solo no programadas: quién autorizó por teléfono',
  `creada_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizada_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_visitas_codigo` (`codigo`),
  KEY `ix_visitas_vivienda_fecha` (`vivienda_id`,`fecha_inicio`,`fecha_fin`),
  KEY `ix_visitas_estado_fecha` (`estado`,`fecha_inicio`,`fecha_fin`),
  CONSTRAINT `ck_visitas_codigo` CHECK (((`codigo` is null) or regexp_like(`codigo`,_utf8mb4'^[A-HJ-NP-Z2-9]{8}$',_utf8mb4'c'))),
  CONSTRAINT `ck_visitas_fechas` CHECK ((`fecha_fin` >= `fecha_inicio`)),
  CONSTRAINT `ck_visitas_horas` CHECK (((`hora_inicio` is null) or (`hora_fin` is null) or (`hora_fin` > `hora_inicio`))),
  CONSTRAINT `ck_visitas_no_programada` CHECK (((`tipo` <> _utf8mb4'no_programada') or ((`codigo` is null) and (`autorizado_por` is not null) and (`fecha_inicio` = `fecha_fin`)))),
  CONSTRAINT `ck_visitas_nombre` CHECK ((char_length(`nombre_visitante`) >= 3)),
  CONSTRAINT `ck_visitas_personas` CHECK ((`numero_personas` between 1 and 20)),
  CONSTRAINT `ck_visitas_programada` CHECK (((`tipo` = _utf8mb4'no_programada') or ((`codigo` is not null) and (`residente_id` is not null) and (`hora_inicio` is not null) and (`hora_fin` is not null) and (`autorizado_por` is null)))),
  CONSTRAINT `ck_visitas_unica` CHECK (((`tipo` <> _utf8mb4'unica') or (`fecha_inicio` = `fecha_fin`)))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='S3. Autorizaciones de entrada';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `visitas`
--

LOCK TABLES `visitas` WRITE;
/*!40000 ALTER TABLE `visitas` DISABLE KEYS */;
INSERT INTO `visitas` VALUES (1,'unica','utilizada','K7P4M2QX',1,'Av. de los Fresnos 214',5,'Laura Méndez Ríos','UMR-482-B',6,'2026-10-24','2026-10-24','18:00:00','23:00:00',NULL,'2026-10-21 16:40:12','2026-11-25 12:46:45'),(2,'frecuente','activa','R9HX3TQW',1,'Av. de los Fresnos 214',5,'Rosa Hernández Gil',NULL,1,'2026-10-26','2027-03-31','08:00:00','15:00:00',NULL,'2026-10-21 16:45:00','2026-11-25 12:46:45'),(3,'unica','cancelada','M4TP8WZK',2,'Av. de los Fresnos 218',7,'Héctor Ortega Luna',NULL,4,'2026-10-25','2026-10-25','14:00:00','20:00:00',NULL,'2026-10-22 12:00:00','2026-11-25 12:46:45'),(4,'unica','vencida','H3JK9VXN',3,'Calle Encino 15',8,'Paola Sánchez Ibarra',NULL,2,'2026-10-22','2026-10-22','10:00:00','13:00:00',NULL,'2026-10-20 18:30:00','2026-11-25 12:46:45'),(5,'unica','activa','B6NQ2RYD',3,'Calle Encino 15',8,'Juan Pérez Morales','UTR-337-A',1,'2026-10-28','2026-10-28','09:00:00','12:00:00',NULL,'2026-10-26 20:10:00','2026-11-25 12:46:45'),(6,'frecuente','activa','T8WE4MPC',4,'Calle Encino 22',9,'Guadalupe Rivas Soto',NULL,1,'2026-09-07','2027-02-26','07:00:00','14:00:00',NULL,'2026-09-05 09:00:00','2026-11-25 12:46:45'),(7,'unica','utilizada','Z5KD7HQA',5,'Privada Sauce 7',10,'Andrea Fuentes Mejía','UVW-905-C',3,'2026-10-26','2026-10-26','19:00:00','23:30:00',NULL,'2026-10-25 11:00:00','2026-11-25 12:46:45'),(8,'no_programada','utilizada',NULL,2,'Av. de los Fresnos 218',NULL,'Jorge Salas Peña','UQX-118-A',1,'2026-10-26','2026-10-26',NULL,NULL,'Fernando Ortega Silva','2026-10-26 19:24:30','2026-11-25 12:46:45'),(9,'unica','utilizada','P2XG6LTE',1,'Av. de los Fresnos 214',6,'Mariana López Ávila',NULL,2,'2026-10-27','2026-10-27','17:00:00','21:00:00',NULL,'2026-10-27 08:15:00','2026-11-25 12:46:45'),(10,'unica','activa','W7RM3BHS',5,'Privada Sauce 7',10,'Sofía Navarro Gil',NULL,8,'2026-10-31','2026-10-31','16:00:00','22:00:00',NULL,'2026-10-27 10:00:00','2026-11-25 12:46:45'),(11,'frecuente','activa','C9VF5NJU',2,'Av. de los Fresnos 218',7,'Pedro Lugo Arias',NULL,1,'2026-10-06','2026-12-29','09:00:00','13:00:00',NULL,'2026-10-05 17:00:00','2026-11-25 12:46:45');
/*!40000 ALTER TABLE `visitas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `viviendas`
--

DROP TABLE IF EXISTS `viviendas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `viviendas` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `calle` varchar(120) NOT NULL,
  `numero` varchar(10) NOT NULL COMMENT 'Número exterior',
  `referencia` varchar(120) DEFAULT NULL COMMENT 'Manzana, lote u otra referencia',
  `activa` tinyint(1) NOT NULL DEFAULT '1',
  `creada_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizada_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_viviendas_domicilio` (`calle`,`numero`),
  CONSTRAINT `ck_viviendas_calle` CHECK ((char_length(trim(`calle`)) > 0)),
  CONSTRAINT `ck_viviendas_numero` CHECK ((char_length(trim(`numero`)) > 0))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='S2. Domicilios del fraccionamiento';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `viviendas`
--

LOCK TABLES `viviendas` WRITE;
/*!40000 ALTER TABLE `viviendas` DISABLE KEYS */;
INSERT INTO `viviendas` VALUES (1,'Av. de los Fresnos','214','Manzana 3, lote 12',1,'2026-09-01 11:00:00','2026-11-25 12:46:45'),(2,'Av. de los Fresnos','218','Manzana 3, lote 14',1,'2026-09-01 11:02:00','2026-11-25 12:46:45'),(3,'Calle Encino','15',NULL,1,'2026-09-01 11:04:00','2026-11-25 12:46:45'),(4,'Calle Encino','22',NULL,1,'2026-09-01 11:06:00','2026-11-25 12:46:45'),(5,'Privada Sauce','7','Casa esquina',1,'2026-09-01 11:08:00','2026-11-25 12:46:45'),(6,'Privada Sauce','9','En remodelación',0,'2026-09-01 11:10:00','2026-11-25 12:46:45');
/*!40000 ALTER TABLE `viviendas` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed
