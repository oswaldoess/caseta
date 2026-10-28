-- =====================================================================
-- Caseta: sistema de control de visitas para fraccionamientos privados
-- Entrega 4. Modelo de datos y persistencia
-- 01_esquema.sql: crea la base `caseta` y las tablas de los 5 servicios
--
-- Se puede ejecutar desde cero las veces que sea necesario:
-- borra la base si ya existe y la vuelve a crear.
-- Probado en MySQL 8.0 y compatible con MySQL 8.4.
--
-- Regla de diseño: cada servicio es dueño de sus tablas.
--   - Dentro de un servicio las relaciones usan FOREIGN KEY.
--   - Entre servicios NO hay FOREIGN KEY: se guarda el id (referencia
--     lógica) y el servicio dueño lo valida por su API interna.
-- =====================================================================

SET NAMES utf8mb4;

DROP DATABASE IF EXISTS caseta;
CREATE DATABASE caseta
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE caseta;

-- =====================================================================
-- S1. IDENTIDAD: usuarios, roles, sesiones y tokens
-- =====================================================================

CREATE TABLE usuarios (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre_completo  VARCHAR(120)  NOT NULL,
  correo           VARCHAR(160)  NOT NULL,
  telefono         CHAR(10)      NOT NULL,
  rol              ENUM('residente', 'guardia', 'administrador') NOT NULL,
  contrasena_hash  CHAR(60)      NOT NULL COMMENT 'Hash bcrypt; nunca la contraseña en texto plano (RNF01)',
  activo           BOOLEAN       NOT NULL DEFAULT TRUE,
  creado_en        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_usuarios PRIMARY KEY (id),
  CONSTRAINT uq_usuarios_correo UNIQUE (correo),
  CONSTRAINT ck_usuarios_nombre CHECK (CHAR_LENGTH(nombre_completo) >= 3),
  CONSTRAINT ck_usuarios_correo CHECK (correo LIKE '_%@_%._%'),
  CONSTRAINT ck_usuarios_telefono CHECK (REGEXP_LIKE(telefono, '^[0-9]{10}$')),
  CONSTRAINT ck_usuarios_hash CHECK (contrasena_hash LIKE '$2_$%')
) ENGINE = InnoDB COMMENT = 'S1. Cuentas del sistema';

CREATE TABLE tokens_revocados (
  jti          CHAR(36)      NOT NULL COMMENT 'Identificador único del JWT',
  usuario_id   INT UNSIGNED  NOT NULL,
  revocado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en    DATETIME      NOT NULL COMMENT 'Después de esta fecha el registro se puede borrar',
  CONSTRAINT pk_tokens_revocados PRIMARY KEY (jti),
  CONSTRAINT fk_tokens_usuario FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT ck_tokens_expira CHECK (expira_en > revocado_en)
) ENGINE = InnoDB COMMENT = 'S1. Tokens cerrados con DELETE /sesiones/actual (I01)';

CREATE INDEX ix_tokens_expira ON tokens_revocados (expira_en);

-- =====================================================================
-- S2. VIVIENDAS: viviendas y asignación de residentes
-- =====================================================================

CREATE TABLE viviendas (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  calle           VARCHAR(120)  NOT NULL,
  numero          VARCHAR(10)   NOT NULL COMMENT 'Número exterior',
  referencia      VARCHAR(120)  NULL     COMMENT 'Manzana, lote u otra referencia',
  activa          BOOLEAN       NOT NULL DEFAULT TRUE,
  creada_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_viviendas PRIMARY KEY (id),
  CONSTRAINT uq_viviendas_domicilio UNIQUE (calle, numero),
  CONSTRAINT ck_viviendas_calle CHECK (CHAR_LENGTH(TRIM(calle)) > 0),
  CONSTRAINT ck_viviendas_numero CHECK (CHAR_LENGTH(TRIM(numero)) > 0)
) ENGINE = InnoDB COMMENT = 'S2. Domicilios del fraccionamiento';

CREATE TABLE residentes_vivienda (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  vivienda_id    INT UNSIGNED  NOT NULL,
  usuario_id     INT UNSIGNED  NOT NULL COMMENT 'Referencia lógica a S1.usuarios (rol residente)',
  es_titular     BOOLEAN       NOT NULL DEFAULT FALSE,
  fecha_alta     DATE          NOT NULL DEFAULT (CURRENT_DATE),
  -- Columna calculada: vale vivienda_id solo si es titular; si no, NULL.
  -- Con el UNIQUE de abajo, cada vivienda tiene como máximo un titular.
  titular_de     INT UNSIGNED  GENERATED ALWAYS AS (IF(es_titular, vivienda_id, NULL)) STORED,
  CONSTRAINT pk_residentes_vivienda PRIMARY KEY (id),
  CONSTRAINT fk_residentes_vivienda FOREIGN KEY (vivienda_id)
    REFERENCES viviendas (id) ON DELETE RESTRICT,
  CONSTRAINT uq_residentes_usuario UNIQUE (usuario_id),
  CONSTRAINT uq_residentes_titular UNIQUE (titular_de)
) ENGINE = InnoDB COMMENT = 'S2. Qué residente vive en qué vivienda';

-- =====================================================================
-- S3. VISITAS: visitas y códigos de acceso
-- =====================================================================

CREATE TABLE visitas (
  id                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  tipo              ENUM('unica', 'frecuente', 'no_programada') NOT NULL,
  estado            ENUM('activa', 'cancelada', 'utilizada', 'vencida') NOT NULL DEFAULT 'activa',
  codigo            CHAR(8)       NULL     COMMENT 'NULL solo en visitas no programadas',
  vivienda_id       INT UNSIGNED  NOT NULL COMMENT 'Referencia lógica a S2.viviendas',
  domicilio         VARCHAR(140)  NOT NULL COMMENT 'Copia del domicilio para la caseta',
  residente_id      INT UNSIGNED  NULL     COMMENT 'Referencia lógica a S1.usuarios; NULL en no programadas',
  nombre_visitante  VARCHAR(120)  NOT NULL,
  placas            VARCHAR(12)   NULL,
  numero_personas   TINYINT UNSIGNED NOT NULL,
  fecha_inicio      DATE          NOT NULL,
  fecha_fin         DATE          NOT NULL,
  hora_inicio       TIME          NULL,
  hora_fin          TIME          NULL,
  autorizado_por    VARCHAR(120)  NULL     COMMENT 'Solo no programadas: quién autorizó por teléfono',
  creada_en         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_visitas PRIMARY KEY (id),
  CONSTRAINT uq_visitas_codigo UNIQUE (codigo),
  -- 8 caracteres en mayúsculas, sin 0, O, 1 ni I ('c' = distingue mayúsculas)
  CONSTRAINT ck_visitas_codigo CHECK (codigo IS NULL OR REGEXP_LIKE(codigo, '^[A-HJ-NP-Z2-9]{8}$', 'c')),
  CONSTRAINT ck_visitas_personas CHECK (numero_personas BETWEEN 1 AND 20),
  CONSTRAINT ck_visitas_nombre CHECK (CHAR_LENGTH(nombre_visitante) >= 3),
  CONSTRAINT ck_visitas_fechas CHECK (fecha_fin >= fecha_inicio),
  CONSTRAINT ck_visitas_horas CHECK (hora_inicio IS NULL OR hora_fin IS NULL OR hora_fin > hora_inicio),
  -- Reglas por tipo de visita
  CONSTRAINT ck_visitas_unica CHECK (tipo <> 'unica' OR fecha_inicio = fecha_fin),
  CONSTRAINT ck_visitas_programada CHECK (
    tipo = 'no_programada'
    OR (codigo IS NOT NULL AND residente_id IS NOT NULL
        AND hora_inicio IS NOT NULL AND hora_fin IS NOT NULL
        AND autorizado_por IS NULL)
  ),
  CONSTRAINT ck_visitas_no_programada CHECK (
    tipo <> 'no_programada'
    OR (codigo IS NULL AND autorizado_por IS NOT NULL AND fecha_inicio = fecha_fin)
  )
) ENGINE = InnoDB COMMENT = 'S3. Autorizaciones de entrada';

CREATE INDEX ix_visitas_vivienda_fecha ON visitas (vivienda_id, fecha_inicio, fecha_fin);
CREATE INDEX ix_visitas_estado_fecha  ON visitas (estado, fecha_inicio, fecha_fin);

CREATE TABLE visita_dias (
  visita_id  INT UNSIGNED NOT NULL,
  dia        ENUM('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo') NOT NULL,
  CONSTRAINT pk_visita_dias PRIMARY KEY (visita_id, dia),
  CONSTRAINT fk_visita_dias_visita FOREIGN KEY (visita_id)
    REFERENCES visitas (id) ON DELETE CASCADE
) ENGINE = InnoDB COMMENT = 'S3. Días válidos de una visita frecuente (diasSemana)';

CREATE TABLE visita_usos (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  visita_id   INT UNSIGNED NOT NULL,
  acceso_id   INT UNSIGNED NOT NULL COMMENT 'Referencia lógica a S4.accesos',
  usado_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_visita_usos PRIMARY KEY (id),
  CONSTRAINT fk_visita_usos_visita FOREIGN KEY (visita_id)
    REFERENCES visitas (id) ON DELETE RESTRICT,
  CONSTRAINT uq_visita_usos_acceso UNIQUE (acceso_id)
) ENGINE = InnoDB COMMENT = 'S3. Cada vez que se usó un código (I07); da tieneEntradas';

-- =====================================================================
-- S4. ACCESOS: entradas, salidas e historial
-- =====================================================================

CREATE TABLE accesos (
  id                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  visita_id           INT UNSIGNED  NOT NULL COMMENT 'Referencia lógica a S3.visitas',
  tipo_visita         ENUM('unica', 'frecuente', 'no_programada') NOT NULL COMMENT 'Copia',
  nombre_visitante    VARCHAR(120)  NOT NULL COMMENT 'Copia',
  numero_personas     TINYINT UNSIGNED NOT NULL COMMENT 'Copia',
  vivienda_id         INT UNSIGNED  NOT NULL COMMENT 'Referencia lógica a S2.viviendas',
  domicilio           VARCHAR(140)  NOT NULL COMMENT 'Copia',
  residente_id        INT UNSIGNED  NULL     COMMENT 'Referencia lógica a S1.usuarios',
  entrada             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  guardia_entrada_id  INT UNSIGNED  NOT NULL COMMENT 'Referencia lógica a S1.usuarios (guardia)',
  salida              DATETIME      NULL,
  guardia_salida_id   INT UNSIGNED  NULL     COMMENT 'Referencia lógica a S1.usuarios (guardia)',
  -- Vale visita_id mientras la visita sigue dentro; NULL cuando ya salió.
  -- Con el UNIQUE, una visita no puede tener dos entradas abiertas (motivo ya_dentro).
  visita_dentro       INT UNSIGNED  GENERATED ALWAYS AS (IF(salida IS NULL, visita_id, NULL)) STORED,
  CONSTRAINT pk_accesos PRIMARY KEY (id),
  CONSTRAINT uq_accesos_visita_dentro UNIQUE (visita_dentro),
  CONSTRAINT ck_accesos_personas CHECK (numero_personas BETWEEN 1 AND 20),
  CONSTRAINT ck_accesos_salida CHECK (salida IS NULL OR salida >= entrada),          -- RN07
  CONSTRAINT ck_accesos_guardia_salida CHECK ((salida IS NULL) = (guardia_salida_id IS NULL))
) ENGINE = InnoDB COMMENT = 'S4. Registro de entrada y salida de cada visita';

CREATE INDEX ix_accesos_entrada          ON accesos (entrada);
CREATE INDEX ix_accesos_vivienda_entrada ON accesos (vivienda_id, entrada);
CREATE INDEX ix_accesos_visita           ON accesos (visita_id);

CREATE TABLE observaciones_acceso (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  acceso_id   INT UNSIGNED  NOT NULL,
  usuario_id  INT UNSIGNED  NOT NULL COMMENT 'Referencia lógica a S1.usuarios (guardia o administrador)',
  texto       VARCHAR(250)  NOT NULL,
  creada_en   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_observaciones_acceso PRIMARY KEY (id),
  CONSTRAINT fk_observaciones_acceso FOREIGN KEY (acceso_id)
    REFERENCES accesos (id) ON DELETE RESTRICT,
  CONSTRAINT ck_observaciones_texto CHECK (CHAR_LENGTH(TRIM(texto)) > 0)
) ENGINE = InnoDB COMMENT = 'S4. Observaciones que se agregan a un acceso (RN08)';

-- =====================================================================
-- S5. REGLAS Y ADEUDOS: adeudos y parámetros del reglamento
-- =====================================================================

CREATE TABLE adeudos (
  id             INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  vivienda_id    INT UNSIGNED   NOT NULL COMMENT 'Referencia lógica a S2.viviendas',
  concepto       VARCHAR(80)    NOT NULL,
  periodo        CHAR(7)        NOT NULL COMMENT 'AAAA-MM',
  monto          DECIMAL(10, 2) NOT NULL,
  estado         ENUM('pendiente', 'liquidado') NOT NULL DEFAULT 'pendiente',
  registrado_en  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  liquidado_en   DATETIME       NULL,
  CONSTRAINT pk_adeudos PRIMARY KEY (id),
  CONSTRAINT ck_adeudos_periodo CHECK (REGEXP_LIKE(periodo, '^[0-9]{4}-(0[1-9]|1[0-2])$')),
  CONSTRAINT ck_adeudos_monto CHECK (monto > 0),
  CONSTRAINT ck_adeudos_liquidado CHECK ((estado = 'liquidado') = (liquidado_en IS NOT NULL)),
  CONSTRAINT ck_adeudos_fechas CHECK (liquidado_en IS NULL OR liquidado_en >= registrado_en)
) ENGINE = InnoDB COMMENT = 'S5. Cuotas de mantenimiento por vivienda';

CREATE INDEX ix_adeudos_vivienda_estado ON adeudos (vivienda_id, estado);

CREATE TABLE parametros (
  clave           VARCHAR(40)   NOT NULL,
  valor           INT           NOT NULL,
  descripcion     VARCHAR(200)  NOT NULL,
  minimo          INT           NOT NULL,
  maximo          INT           NOT NULL,
  actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  actualizado_por INT UNSIGNED  NULL COMMENT 'Referencia lógica a S1.usuarios (administrador)',
  CONSTRAINT pk_parametros PRIMARY KEY (clave),
  CONSTRAINT ck_parametros_clave CHECK (REGEXP_LIKE(clave, '^[a-z_]+$', 'c')),
  CONSTRAINT ck_parametros_rango CHECK (minimo <= maximo),
  CONSTRAINT ck_parametros_valor CHECK (valor BETWEEN minimo AND maximo)
) ENGINE = InnoDB COMMENT = 'S5. Valores configurables del reglamento';
