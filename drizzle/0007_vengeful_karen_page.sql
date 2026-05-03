CREATE TABLE `userBranchAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`branchId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userBranchAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_branch_assignment_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` DROP FOREIGN KEY `users_assignedBranchId_branches_id_fk`;
--> statement-breakpoint
ALTER TABLE `userBranchAssignments` ADD CONSTRAINT `userBranchAssignments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `userBranchAssignments` ADD CONSTRAINT `userBranchAssignments_branchId_branches_id_fk` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `assignedBranchId`;