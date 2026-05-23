USE `artifact_db`;
ALTER TABLE artifact ADD COLUMN description TEXT DEFAULT NULL;
ALTER TABLE artifact ADD COLUMN is_deleted TINYINT(1) DEFAULT 0;
