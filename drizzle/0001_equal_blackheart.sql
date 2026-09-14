CREATE TABLE `farmProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`village` varchar(80) NOT NULL,
	`district` varchar(80) NOT NULL,
	`state` varchar(80) NOT NULL,
	`cropPreferences` text NOT NULL,
	`language` enum('en','hi','mr') NOT NULL DEFAULT 'en',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `farmProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `farmProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `privateCropScans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cropName` varchar(80) NOT NULL,
	`localName` varchar(80) NOT NULL,
	`healthStatus` enum('healthy','attention','uncertain') NOT NULL,
	`overview` text NOT NULL,
	`imageUrl` varchar(2048),
	`payload` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `privateCropScans_id` PRIMARY KEY(`id`)
);
