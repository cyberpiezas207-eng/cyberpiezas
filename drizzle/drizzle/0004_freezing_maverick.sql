CREATE TABLE `transferPaymentRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planCode` enum('free','basic','professional','premium','lifetime') NOT NULL,
	`planName` varchar(50) NOT NULL,
	`billingType` enum('monthly','lifetime') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`payerName` varchar(150) NOT NULL,
	`transferReference` varchar(120) NOT NULL,
	`proofUrl` text,
	`notes` text,
	`status` enum('pending','approved','rejected','canceled') NOT NULL DEFAULT 'pending',
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`activatedAt` timestamp,
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transferPaymentRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `currency` varchar(3) DEFAULT 'MXN';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `subscriptionPlan` enum('free','basic','professional','premium','lifetime') NOT NULL DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `subscriptionStatus` enum('inactive','pending_review','active','canceled','past_due','unpaid','trialing','rejected') DEFAULT 'inactive';--> statement-breakpoint
ALTER TABLE `payments` ADD `paymentProvider` varchar(30) DEFAULT 'manual_transfer';--> statement-breakpoint
ALTER TABLE `payments` ADD `externalReference` varchar(255);--> statement-breakpoint
ALTER TABLE `payments` ADD `proofUrl` text;--> statement-breakpoint
ALTER TABLE `transferPaymentRequests` ADD CONSTRAINT `transferPaymentRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;