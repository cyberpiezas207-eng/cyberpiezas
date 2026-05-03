ALTER TABLE `categories` DROP INDEX `categories_name_unique`;--> statement-breakpoint
ALTER TABLE `categories` ADD `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `user_category_unique` UNIQUE(`userId`,`name`);--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;