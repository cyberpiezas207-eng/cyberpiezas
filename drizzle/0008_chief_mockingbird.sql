CREATE TABLE `productImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`imageUrl` varchar(1000) NOT NULL,
	`storageKey` varchar(255),
	`altText` varchar(255),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productImages_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_images_product_sort_unique` UNIQUE(`productId`,`sortOrder`)
);
