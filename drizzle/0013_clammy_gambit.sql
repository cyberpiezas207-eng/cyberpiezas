CREATE TABLE `subdomainRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessName` varchar(160) NOT NULL,
	`requestedSubdomain` varchar(120) NOT NULL,
	`contactWhatsApp` varchar(40),
	`notes` text,
	`status` enum('pending','quoted','approved','assigned','rejected','canceled') NOT NULL DEFAULT 'pending',
	`availabilityStatus` enum('unchecked','available','unavailable','reserved') NOT NULL DEFAULT 'unchecked',
	`quotedPrice` decimal(10,2),
	`currency` varchar(3) NOT NULL DEFAULT 'MXN',
	`assignedSubdomain` varchar(160),
	`adminNotes` text,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subdomainRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `subdomainRequests` ADD CONSTRAINT `subdomainRequests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subdomainRequests` ADD CONSTRAINT `subdomainRequests_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;