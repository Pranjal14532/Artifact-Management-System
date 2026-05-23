USE `artifact_db`;

-- Trigger for AFTER INSERT
DELIMITER //
CREATE TRIGGER `after_artifact_insert`
AFTER INSERT ON `artifact`
FOR EACH ROW
BEGIN
    INSERT INTO `artifactlog` (`artifact_id`, `artifact_name`, `action`, `done_by`)
    VALUES (NEW.`artifact_id`, NEW.`name`, 'INSERT', NEW.`added_by`);
END //
DELIMITER ;

-- Trigger for AFTER DELETE
DELIMITER //
CREATE TRIGGER `after_artifact_delete`
AFTER DELETE ON `artifact`
FOR EACH ROW
BEGIN
    INSERT INTO `artifactlog` (`artifact_id`, `artifact_name`, `action`, `done_by`)
    VALUES (OLD.`artifact_id`, OLD.`name`, 'DELETE', NULL); -- added_by is not available on delete easily without session vars
END //
DELIMITER ;

-- Trigger for AFTER UPDATE
DELIMITER //
CREATE TRIGGER `after_artifact_update`
AFTER UPDATE ON `artifact`
FOR EACH ROW
BEGIN
    INSERT INTO `artifactlog` (`artifact_id`, `artifact_name`, `action`, `done_by`)
    VALUES (NEW.`artifact_id`, NEW.`name`, 'UPDATE', NEW.`added_by`);
END //
DELIMITER ;
