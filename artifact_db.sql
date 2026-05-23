CREATE DATABASE IF NOT EXISTS `artifact_db` DEFAULT CHARACTER SET utf8mb4;
USE `artifact_db`;

-- ─────────────────────────────────────────
--  DROP ORDER (children first)
-- ─────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `artifactlog`;
DROP TABLE IF EXISTS `exhibitionartifact`;
DROP TABLE IF EXISTS `artifactmaterial`;
DROP TABLE IF EXISTS `countrylanguage`;
DROP TABLE IF EXISTS `exhibition`;
DROP TABLE IF EXISTS `artifact`;
DROP TABLE IF EXISTS `museum`;
DROP TABLE IF EXISTS `period`;
DROP TABLE IF EXISTS `country`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────────────────────────────────
--  USERS
-- ─────────────────────────────────────────
CREATE TABLE `users` (
  `user_id`       INT NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          ENUM('admin','viewer') NOT NULL DEFAULT 'viewer',
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- bcrypt hash of "password" (cost 10)
INSERT INTO `users` (`name`, `password_hash`, `role`) VALUES
  ('Admin1', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
  ('User2',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'viewer');

-- ─────────────────────────────────────────
--  COUNTRY
-- ─────────────────────────────────────────
CREATE TABLE `country` (
  `country_id` INT NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(100) NOT NULL,
  `continent`  VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`country_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `country` (`name`, `continent`) VALUES
  ('India',  'Asia'),
  ('Egypt',  'Africa'),
  ('Greece', 'Europe'),
  ('China',  'Asia'),
  ('Italy',  'Europe');

-- ─────────────────────────────────────────
--  COUNTRY LANGUAGE
-- ─────────────────────────────────────────
CREATE TABLE `countrylanguage` (
  `country_id` INT NOT NULL,
  `language`   VARCHAR(100) NOT NULL,
  PRIMARY KEY (`country_id`, `language`),
  CONSTRAINT `cl_fk1` FOREIGN KEY (`country_id`) REFERENCES `country`(`country_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `countrylanguage` VALUES (1,'Hindi'),(2,'Arabic'),(3,'Greek'),(4,'Mandarin'),(5,'Italian');

-- ─────────────────────────────────────────
--  PERIOD
-- ─────────────────────────────────────────
CREATE TABLE `period` (
  `period_id`  INT NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(100) NOT NULL,
  `start_year` INT DEFAULT NULL,
  `end_year`   INT DEFAULT NULL,
  PRIMARY KEY (`period_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `period` (`name`, `start_year`, `end_year`) VALUES
  ('Ancient Period',    -3000,  500),
  ('Medieval Period',     500, 1500),
  ('Renaissance',        1300, 1600),
  ('Industrial Age',     1760, 1900),
  ('Modern Era',         1900, 2000);

-- ─────────────────────────────────────────
--  MUSEUM
-- ─────────────────────────────────────────
CREATE TABLE `museum` (
  `museum_id`        INT NOT NULL AUTO_INCREMENT,
  `name`             VARCHAR(100) NOT NULL,
  `city`             VARCHAR(100) DEFAULT NULL,
  `state`            VARCHAR(100) DEFAULT NULL,
  `year_established` INT DEFAULT NULL,
  `country_id`       INT DEFAULT NULL,
  PRIMARY KEY (`museum_id`),
  CONSTRAINT `museum_fk1` FOREIGN KEY (`country_id`) REFERENCES `country`(`country_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `museum` (`name`, `city`, `state`, `year_established`, `country_id`) VALUES
  ('National Museum',        'Delhi',     'Delhi',         1949, 1),
  ('Egyptian Museum',        'Cairo',     'Cairo',         1902, 2),
  ('Acropolis Museum',       'Athens',    'Attica',        2009, 3),
  ('National Palace Museum', 'Taipei',    NULL,            1965, 4),
  ('Vatican Museums',        'Vatican',   NULL,            1506, 5);

-- ─────────────────────────────────────────
--  ARTIFACT  (museum_id added here)
-- ─────────────────────────────────────────
CREATE TABLE `artifact` (
  `artifact_id` INT NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL,
  `age`         INT DEFAULT NULL,
  `country_id`  INT DEFAULT NULL,
  `period_id`   INT DEFAULT NULL,
  `museum_id`   INT DEFAULT NULL,
  `added_by`    INT DEFAULT NULL,
  `image_path`  VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`artifact_id`),
  CONSTRAINT `art_fk1` FOREIGN KEY (`country_id`) REFERENCES `country`(`country_id`) ON DELETE SET NULL,
  CONSTRAINT `art_fk2` FOREIGN KEY (`period_id`)  REFERENCES `period`(`period_id`)   ON DELETE SET NULL,
  CONSTRAINT `art_fk3` FOREIGN KEY (`museum_id`)  REFERENCES `museum`(`museum_id`)   ON DELETE SET NULL,
  CONSTRAINT `art_fk4` FOREIGN KEY (`added_by`)   REFERENCES `users`(`user_id`)      ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `artifact` (`name`, `age`, `country_id`, `period_id`, `museum_id`, `added_by`) VALUES
  ('Mohenjo-daro Seal',    4500, 1, 1, 1, 1),
  ('Harappan Pottery',     4000, 1, 1, 1, 1),
  ('Shivaji Sword',         300, 1, 2, 1, 1),
  ('Golden Death Mask',    3300, 2, 1, 2, 1),
  ('Rosetta Stone',        2200, 2, 1, 2, 1),
  ('Parthenon Frieze',     2400, 3, 1, 3, 1),
  ('Bronze Vessel',        3000, 4, 1, 4, 1),
  ('Roman Marble Bust',    1900, 5, 1, 5, 1);

-- ─────────────────────────────────────────
--  ARTIFACT MATERIAL
-- ─────────────────────────────────────────
CREATE TABLE `artifactmaterial` (
  `artifact_id` INT NOT NULL,
  `material`    VARCHAR(100) NOT NULL,
  PRIMARY KEY (`artifact_id`, `material`),
  CONSTRAINT `am_fk1` FOREIGN KEY (`artifact_id`) REFERENCES `artifact`(`artifact_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `artifactmaterial` VALUES
  (1,'Steatite'),(1,'Clay'),
  (2,'Terracotta'),
  (3,'Steel'),(3,'Iron'),
  (4,'Gold'),
  (5,'Granodiorite'),(5,'Stone'),
  (6,'Marble'),
  (7,'Bronze'),
  (8,'Marble');

-- ─────────────────────────────────────────
--  EXHIBITION
-- ─────────────────────────────────────────
CREATE TABLE `exhibition` (
  `exhibition_id` INT NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(100) NOT NULL,
  `start_date`    DATE DEFAULT NULL,
  `end_date`      DATE DEFAULT NULL,
  `museum_id`     INT DEFAULT NULL,
  `created_by`    INT DEFAULT NULL,
  PRIMARY KEY (`exhibition_id`),
  CONSTRAINT `ex_fk1` FOREIGN KEY (`museum_id`)  REFERENCES `museum`(`museum_id`)  ON DELETE CASCADE,
  CONSTRAINT `ex_fk2` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `exhibition` (`name`, `start_date`, `end_date`, `museum_id`, `created_by`) VALUES
  ('Indus Valley Civilisation', '2026-01-01', '2026-06-30', 1, 1),
  ('Wonders of Ancient Egypt',  '2026-03-01', '2026-09-01', 2, 1),
  ('Classical Greece',          '2026-05-01', '2026-12-31', 3, 1);

-- ─────────────────────────────────────────
--  EXHIBITION ↔ ARTIFACT (junction)
-- ─────────────────────────────────────────
CREATE TABLE `exhibitionartifact` (
  `exhibition_id` INT NOT NULL,
  `artifact_id`   INT NOT NULL,
  PRIMARY KEY (`exhibition_id`, `artifact_id`),
  CONSTRAINT `ea_fk1` FOREIGN KEY (`exhibition_id`) REFERENCES `exhibition`(`exhibition_id`) ON DELETE CASCADE,
  CONSTRAINT `ea_fk2` FOREIGN KEY (`artifact_id`)   REFERENCES `artifact`(`artifact_id`)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `exhibitionartifact` VALUES
  (1,1),(1,2),(1,3),
  (2,4),(2,5),
  (3,6);

-- ─────────────────────────────────────────
--  ARTIFACT LOG  (trigger-managed)
-- ─────────────────────────────────────────
CREATE TABLE `artifactlog` (
  `log_id`        INT NOT NULL AUTO_INCREMENT,
  `artifact_id`   INT DEFAULT NULL,
  `artifact_name` VARCHAR(100) DEFAULT NULL,
  `action`        VARCHAR(10) DEFAULT NULL,
  `action_time`   DATETIME DEFAULT CURRENT_TIMESTAMP,
  `done_by`       INT DEFAULT NULL,
  PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────
--  SUGGESTIONS
-- ─────────────────────────────────────────
CREATE TABLE `suggestions` (
  `suggestion_id` INT NOT NULL AUTO_INCREMENT,
  `type`          ENUM('exhibition', 'artifact') NOT NULL,
  `title`         VARCHAR(100) NOT NULL,
  `description`   TEXT,
  `museum_id`     INT DEFAULT NULL,
  `suggested_by`  INT DEFAULT NULL,
  `status`        ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  `created_at`    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`suggestion_id`),
  CONSTRAINT `sug_fk1` FOREIGN KEY (`museum_id`)  REFERENCES `museum`(`museum_id`)  ON DELETE CASCADE,
  CONSTRAINT `sug_fk2` FOREIGN KEY (`suggested_by`) REFERENCES `users`(`user_id`)     ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
