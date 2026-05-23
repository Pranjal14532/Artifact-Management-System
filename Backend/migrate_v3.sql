USE `artifact_db`;

CREATE TABLE IF NOT EXISTS `exhibitionfeedback` (
  `feedback_id` INT NOT NULL AUTO_INCREMENT,
  `exhibition_id` INT NOT NULL,
  `user_id` INT DEFAULT NULL,
  `rating` INT NOT NULL,
  `comments` TEXT,
  `visited_date` DATE DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  CONSTRAINT `ef_fk1` FOREIGN KEY (`exhibition_id`) REFERENCES `exhibition` (`exhibition_id`) ON DELETE CASCADE,
  CONSTRAINT `ef_fk2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
