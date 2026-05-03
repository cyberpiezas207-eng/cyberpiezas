CREATE TABLE `abuseLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`attemptType` enum('create_account','edit_product','access_restricted','unauthorized_action') NOT NULL,
	`description` text NOT NULL,
	`ipAddress` varchar(64),
	`userAgent` text,
	`severity` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`reviewed` boolean NOT NULL DEFAULT false,
	`notes` text,
	CONSTRAINT `abuseLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `abuseLog` ADD CONSTRAINT `abuseLog_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;