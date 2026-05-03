CREATE TABLE `userProgramAccess` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`programCode` enum('boutique','abarrotes','celine') NOT NULL,
	`status` enum('active','pending','inactive','suspended','expired') NOT NULL DEFAULT 'active',
	`accessSource` enum('subscription','manual_license','trial','referral','admin_override') NOT NULL DEFAULT 'subscription',
	`startsAt` timestamp NOT NULL DEFAULT (now()),
	`endsAt` timestamp,
	`grantedByUserId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProgramAccess_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_program_unique` UNIQUE(`userId`,`programCode`)
);
--> statement-breakpoint
ALTER TABLE `userProgramAccess` ADD CONSTRAINT `userProgramAccess_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userProgramAccess` ADD CONSTRAINT `userProgramAccess_grantedByUserId_users_id_fk` FOREIGN KEY (`grantedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;