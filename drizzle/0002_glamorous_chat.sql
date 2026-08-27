CREATE TABLE `api_rate_limits` (
	`scope` text NOT NULL,
	`client_key` text NOT NULL,
	`window_started_at` integer NOT NULL,
	`request_count` integer NOT NULL,
	PRIMARY KEY(`scope`, `client_key`)
);
--> statement-breakpoint
CREATE INDEX `api_rate_limits_window_idx` ON `api_rate_limits` (`window_started_at`);