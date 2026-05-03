ALTER TABLE `categories` DROP INDEX `categories_name_unique`;--> statement-breakpoint
ALTER TABLE `products` DROP INDEX `products_sku_unique`;--> statement-breakpoint
ALTER TABLE `categories` ADD `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `user_category_name_unique` UNIQUE(`userId`,`name`);--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `user_product_sku_unique` UNIQUE(`userId`,`sku`);--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;