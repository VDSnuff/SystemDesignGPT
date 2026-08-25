CREATE TABLE `learning_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`user_email` text NOT NULL,
	`page_slug` text NOT NULL,
	`page_title` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `learning_comments_status_created_idx` ON `learning_comments` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `learning_page_state` (
	`user_id` text NOT NULL,
	`page_slug` text NOT NULL,
	`note` text NOT NULL,
	`diagram_payload` text NOT NULL,
	`quiz_payload` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `page_slug`)
);
