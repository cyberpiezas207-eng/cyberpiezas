CREATE TABLE `systemBrandingSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`appTitle` varchar(120) NOT NULL DEFAULT 'Boutique POS',
	`appSubtitle` varchar(180) DEFAULT 'Centro de operación',
	`bannerImageUrl` varchar(1000),
	`bannerStorageKey` varchar(255),
	`bannerAltText` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `systemBrandingSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `systemBrandingSettings` ADD CONSTRAINT `systemBrandingSettings_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;