CREATE TABLE `userAccessLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`openId` varchar(64) NOT NULL,
	`eventType` enum('login','logout','session_refresh','failed_login') NOT NULL DEFAULT 'login',
	`loginMethod` varchar(64),
	`ipAddress` varchar(64),
	`userAgent` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userAccessLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `userAccessLogs` ADD CONSTRAINT `userAccessLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;