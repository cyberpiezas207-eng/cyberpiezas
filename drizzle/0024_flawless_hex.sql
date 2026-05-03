CREATE TABLE `subscriberPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriberId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`plan` enum('basic','professional','permanent') NOT NULL,
	`paymentMethod` enum('transfer','card','other') NOT NULL DEFAULT 'transfer',
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`transactionId` varchar(255),
	`notes` text,
	`paymentDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriberPayments_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriberPayments_transactionId_unique` UNIQUE(`transactionId`)
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`businessName` varchar(255),
	`plan` enum('basic','professional','permanent') NOT NULL DEFAULT 'basic',
	`status` enum('pending_payment','active','suspended','canceled') NOT NULL DEFAULT 'pending_payment',
	`registrationDate` timestamp NOT NULL DEFAULT (now()),
	`paymentDate` timestamp,
	`expirationDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscribers_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscribers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `subscriberPayments` ADD CONSTRAINT `subscriberPayments_subscriberId_subscribers_id_fk` FOREIGN KEY (`subscriberId`) REFERENCES `subscribers`(`id`) ON DELETE no action ON UPDATE no action;