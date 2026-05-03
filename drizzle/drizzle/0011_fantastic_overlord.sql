CREATE TABLE `licenseGrantHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`licenseGrantId` int NOT NULL,
	`changedByUserId` int NOT NULL,
	`previousStatus` enum('active','suspended','revoked','expired'),
	`newStatus` enum('active','suspended','revoked','expired') NOT NULL,
	`changeReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `licenseGrantHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manualLicenseGrants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`grantedByUserId` int NOT NULL,
	`planCode` enum('free','basic','professional','premium','annual') NOT NULL,
	`licenseType` enum('free_special','promotional','trial','manual_grant') NOT NULL DEFAULT 'manual_grant',
	`status` enum('active','suspended','revoked','expired') NOT NULL DEFAULT 'active',
	`reason` text,
	`validFrom` timestamp NOT NULL,
	`validUntil` timestamp,
	`requiresYouTube` boolean DEFAULT false,
	`requiresFacebook` boolean DEFAULT false,
	`youtubeVerified` boolean DEFAULT false,
	`facebookVerified` boolean DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manualLicenseGrants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `licenseGrantHistory` ADD CONSTRAINT `licenseGrantHistory_licenseGrantId_manualLicenseGrants_id_fk` FOREIGN KEY (`licenseGrantId`) REFERENCES `manualLicenseGrants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `licenseGrantHistory` ADD CONSTRAINT `licenseGrantHistory_changedByUserId_users_id_fk` FOREIGN KEY (`changedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `manualLicenseGrants` ADD CONSTRAINT `manualLicenseGrants_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `manualLicenseGrants` ADD CONSTRAINT `manualLicenseGrants_grantedByUserId_users_id_fk` FOREIGN KEY (`grantedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;