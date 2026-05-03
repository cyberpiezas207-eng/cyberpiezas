CREATE TABLE `featureRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`status` enum('pending','under_review','approved','implemented','rejected') NOT NULL DEFAULT 'pending',
	`priority` enum('low','medium','high') DEFAULT 'medium',
	`category` varchar(50),
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `featureRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `manualLicenseGrants` MODIFY COLUMN `planCode` enum('free','basic','professional','premium','annual') NOT NULL;--> statement-breakpoint
ALTER TABLE `transferPaymentRequests` MODIFY COLUMN `planCode` enum('free','basic','professional','premium','annual') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `subscriptionPlan` enum('free','basic','professional','premium','annual') NOT NULL DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `featureRequests` ADD CONSTRAINT `featureRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `featureRequests` ADD CONSTRAINT `featureRequests_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `billingCycle`;