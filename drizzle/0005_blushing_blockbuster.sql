CREATE TABLE `branchInventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`productVariantId` int NOT NULL,
	`stock` int NOT NULL DEFAULT 0,
	`minimumStock` int NOT NULL DEFAULT 5,
	`lastAdjustedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branchInventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branchInventoryMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`productVariantId` int NOT NULL,
	`movementType` enum('sale','adjustment','return','purchase','transfer_out','transfer_in') NOT NULL,
	`quantity` int NOT NULL,
	`reason` text,
	`relatedTransferId` int,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `branchInventoryMovements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branchSales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`saleNumber` varchar(50) NOT NULL,
	`userId` int NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`discount` decimal(10,2) NOT NULL DEFAULT '0',
	`tax` decimal(10,2) NOT NULL DEFAULT '0',
	`total` decimal(10,2) NOT NULL,
	`paymentMethod` enum('cash','card','transfer') NOT NULL DEFAULT 'cash',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branchSales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`code` varchar(50) NOT NULL,
	`address` text,
	`city` varchar(100),
	`state` varchar(100),
	`zipCode` varchar(20),
	`phone` varchar(20),
	`email` varchar(320),
	`manager` varchar(150),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stockTransfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromBranchId` int NOT NULL,
	`toBranchId` int NOT NULL,
	`productVariantId` int NOT NULL,
	`quantity` int NOT NULL,
	`reason` text,
	`status` enum('pending','in_transit','received','canceled') NOT NULL DEFAULT 'pending',
	`initiatedByUserId` int NOT NULL,
	`receivedByUserId` int,
	`initiatedAt` timestamp NOT NULL DEFAULT (now()),
	`receivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stockTransfers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `branchInventory` ADD CONSTRAINT `branchInventory_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `branchInventory` ADD CONSTRAINT `branchInventory_productVariantId_productVariants_id_fk` FOREIGN KEY (`productVariantId`) REFERENCES `productVariants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `branchInventoryMovements` ADD CONSTRAINT `branchInventoryMovements_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `branchInventoryMovements` ADD CONSTRAINT `branchInventoryMovements_productVariantId_productVariants_id_fk` FOREIGN KEY (`productVariantId`) REFERENCES `productVariants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `branchInventoryMovements` ADD CONSTRAINT `branchInventoryMovements_relatedTransferId_stockTransfers_id_fk` FOREIGN KEY (`relatedTransferId`) REFERENCES `stockTransfers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `branchInventoryMovements` ADD CONSTRAINT `branchInventoryMovements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `branchSales` ADD CONSTRAINT `branchSales_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `branchSales` ADD CONSTRAINT `branchSales_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `branches` ADD CONSTRAINT `branches_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stockTransfers` ADD CONSTRAINT `stockTransfers_fromBranchId_branches_id_fk` FOREIGN KEY (`fromBranchId`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stockTransfers` ADD CONSTRAINT `stockTransfers_toBranchId_branches_id_fk` FOREIGN KEY (`toBranchId`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stockTransfers` ADD CONSTRAINT `stockTransfers_productVariantId_productVariants_id_fk` FOREIGN KEY (`productVariantId`) REFERENCES `productVariants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stockTransfers` ADD CONSTRAINT `stockTransfers_initiatedByUserId_users_id_fk` FOREIGN KEY (`initiatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stockTransfers` ADD CONSTRAINT `stockTransfers_receivedByUserId_users_id_fk` FOREIGN KEY (`receivedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;