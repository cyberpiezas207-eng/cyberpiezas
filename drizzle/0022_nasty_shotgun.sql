CREATE TABLE `cashMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int,
	`userId` int NOT NULL,
	`movementType` enum('entry','exit') NOT NULL,
	`category` varchar(100) NOT NULL DEFAULT 'general',
	`amount` decimal(10,2) NOT NULL,
	`reason` text NOT NULL,
	`notes` text,
	`relatedSaleId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cashMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saleReturnDetails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleReturnId` int NOT NULL,
	`saleDetailId` int NOT NULL,
	`productVariantId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`size` varchar(50) NOT NULL,
	`color` varchar(100) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`lineTotal` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saleReturnDetails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saleReturns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`saleId` int NOT NULL,
	`branchId` int,
	`userId` int NOT NULL,
	`returnNumber` varchar(50) NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`tax` decimal(10,2) NOT NULL DEFAULT '0',
	`total` decimal(10,2) NOT NULL,
	`reason` text NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saleReturns_id` PRIMARY KEY(`id`),
	CONSTRAINT `saleReturns_returnNumber_unique` UNIQUE(`returnNumber`)
);
--> statement-breakpoint
ALTER TABLE `cashMovements` ADD CONSTRAINT `cashMovements_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cashMovements` ADD CONSTRAINT `cashMovements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cashMovements` ADD CONSTRAINT `cashMovements_relatedSaleId_sales_id_fk` FOREIGN KEY (`relatedSaleId`) REFERENCES `sales`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleReturnDetails` ADD CONSTRAINT `saleReturnDetails_saleReturnId_saleReturns_id_fk` FOREIGN KEY (`saleReturnId`) REFERENCES `saleReturns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleReturnDetails` ADD CONSTRAINT `saleReturnDetails_saleDetailId_saleDetails_id_fk` FOREIGN KEY (`saleDetailId`) REFERENCES `saleDetails`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleReturnDetails` ADD CONSTRAINT `saleReturnDetails_productVariantId_productVariants_id_fk` FOREIGN KEY (`productVariantId`) REFERENCES `productVariants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleReturns` ADD CONSTRAINT `saleReturns_saleId_sales_id_fk` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleReturns` ADD CONSTRAINT `saleReturns_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saleReturns` ADD CONSTRAINT `saleReturns_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;