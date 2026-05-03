CREATE TABLE `freeTrialLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planCode` enum('basic','professional','premium') NOT NULL,
	`trialStartDate` timestamp NOT NULL DEFAULT (now()),
	`trialEndDate` timestamp NOT NULL,
	`reminderSentAt` timestamp,
	`reminderResponse` enum('pending','will_pay','continue_free','no_response') DEFAULT 'pending',
	`convertedToPaid` boolean DEFAULT false,
	`convertedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `freeTrialLogs_id` PRIMARY KEY(`id`),
	CONSTRAINT `freeTrialLogs_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `referralCodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referralCode` varchar(20) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`freeMonthGranted` boolean NOT NULL DEFAULT false,
	`freeMonthGrantedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referralCodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `referralCodes_referralCode_unique` UNIQUE(`referralCode`)
);
--> statement-breakpoint
CREATE TABLE `referralTracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referredUserId` int NOT NULL,
	`referralCode` varchar(20) NOT NULL,
	`planCode` enum('basic','professional','premium') NOT NULL,
	`status` enum('pending','active','completed') NOT NULL DEFAULT 'pending',
	`freeMonthAppliedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referralTracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `freeTrialLogs` ADD CONSTRAINT `freeTrialLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralCodes` ADD CONSTRAINT `referralCodes_referrerId_users_id_fk` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralTracking` ADD CONSTRAINT `referralTracking_referrerId_users_id_fk` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referralTracking` ADD CONSTRAINT `referralTracking_referredUserId_users_id_fk` FOREIGN KEY (`referredUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;