CREATE TABLE `handbook_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`last_page_slug` text,
	`last_heading_id` text,
	`completed_sections_payload` text DEFAULT '[]' NOT NULL,
	`checked_items_payload` text DEFAULT '[]' NOT NULL,
	`updated_at` text NOT NULL
);
