CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`parent_id` text,
	`text` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`up_votes` integer DEFAULT 0 NOT NULL,
	`down_votes` integer DEFAULT 0 NOT NULL,
	`depth` integer DEFAULT 0 NOT NULL,
	`is_removed` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `comments_post_id_idx` ON `comments` (`post_id`);--> statement-breakpoint
CREATE INDEX `comments_parent_id_idx` ON `comments` (`parent_id`);--> statement-breakpoint
CREATE INDEX `comments_user_id_idx` ON `comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `comments_post_score_idx` ON `comments` (`post_id`,`score`);--> statement-breakpoint
CREATE TABLE `domain_bans` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`reason` text,
	`banned_by_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`banned_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domain_bans_domain_unique` ON `domain_bans` (`domain`);--> statement-breakpoint
CREATE TABLE `moderation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`moderator_id` text NOT NULL,
	`target_id` text NOT NULL,
	`target_type` text NOT NULL,
	`action` text NOT NULL,
	`reason` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`moderator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mod_logs_moderator_idx` ON `moderation_logs` (`moderator_id`);--> statement-breakpoint
CREATE INDEX `mod_logs_target_idx` ON `moderation_logs` (`target_id`);--> statement-breakpoint
CREATE TABLE `moderation_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`reason` text,
	`report_count` integer DEFAULT 0 NOT NULL,
	`auto_flagged` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `moderation_queue_post_idx` ON `moderation_queue` (`post_id`);--> statement-breakpoint
CREATE TABLE `oauth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_provider_account_idx` ON `oauth_accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE TABLE `post_tags` (
	`post_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_tags_unique_idx` ON `post_tags` (`post_id`,`tag_id`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`text` text,
	`domain` text,
	`slug` text NOT NULL,
	`user_id` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`up_votes` integer DEFAULT 0 NOT NULL,
	`down_votes` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`hot_score` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`og_title` text,
	`og_description` text,
	`og_image_url` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_user_id_idx` ON `posts` (`user_id`);--> statement-breakpoint
CREATE INDEX `posts_status_hot_idx` ON `posts` (`status`,`hot_score`);--> statement-breakpoint
CREATE INDEX `posts_status_created_idx` ON `posts` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `posts_status_score_idx` ON `posts` (`status`,`score`);--> statement-breakpoint
CREATE INDEX `posts_domain_idx` ON `posts` (`domain`);--> statement-breakpoint
CREATE INDEX `posts_slug_idx` ON `posts` (`slug`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text NOT NULL,
	`target_id` text NOT NULL,
	`target_type` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_by_id` text,
	`resolved_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `reports_target_idx` ON `reports` (`target_id`,`target_type`);--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `reports` (`status`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_token_idx` ON `sessions` (`token`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`post_count` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE INDEX `tags_slug_idx` ON `tags` (`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`karma` integer DEFAULT 0 NOT NULL,
	`avatar_url` text,
	`bio` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`email_verify_token` text,
	`password_reset_token` text,
	`password_reset_expiry` text,
	`banned_at` text,
	`banned_reason` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target_id` text NOT NULL,
	`target_type` text NOT NULL,
	`value` integer NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `votes_unique_idx` ON `votes` (`user_id`,`target_id`,`target_type`);--> statement-breakpoint
CREATE INDEX `votes_target_idx` ON `votes` (`target_id`,`target_type`);