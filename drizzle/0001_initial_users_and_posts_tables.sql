CREATE TABLE `posts` (
	`uri` text PRIMARY KEY NOT NULL,
	`user_did` text NOT NULL,
	`cid` text NOT NULL,
	`rkey` text NOT NULL,
	`record` text NOT NULL,
	`text` text NOT NULL,
	`has_images` integer DEFAULT false NOT NULL,
	`has_embed` integer DEFAULT false NOT NULL,
	`embed_data` text,
	`created_at` integer NOT NULL,
	`indexed_at` integer NOT NULL,
	FOREIGN KEY (`user_did`) REFERENCES `users`(`did`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `posts_user_did_idx` ON `posts` (`user_did`);--> statement-breakpoint
CREATE INDEX `posts_created_at_idx` ON `posts` (`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`did` text PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`custom_css` text,
	`theme_name` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
