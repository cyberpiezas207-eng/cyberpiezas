CREATE TABLE `productBranchAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`branchId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productBranchAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_branch_assignment_unique` UNIQUE(`productId`,`branchId`)
);
--> statement-breakpoint
ALTER TABLE `productBranchAssignments` ADD CONSTRAINT `productBranchAssignments_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productBranchAssignments` ADD CONSTRAINT `productBranchAssignments_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;