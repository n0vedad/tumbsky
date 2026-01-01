CREATE TABLE `oauth_session` (
	`did` text PRIMARY KEY NOT NULL,
	`session` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `oauth_session_updated_at_idx` ON `oauth_session` (`updated_at`);--> statement-breakpoint
CREATE TABLE `oauth_state` (
	`key` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `oauth_state_expires_at_idx` ON `oauth_state` (`expires_at`);