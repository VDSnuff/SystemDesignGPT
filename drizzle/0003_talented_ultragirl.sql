CREATE INDEX `learning_comments_created_id_idx` ON `learning_comments` (`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `learning_comments_user_idx` ON `learning_comments` (`user_id`);