CREATE TABLE `cropAlertThresholds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cropName` varchar(80) NOT NULL,
	`priceFloor` int NOT NULL,
	`rainChance` int NOT NULL,
	`soilMoistureMinimum` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cropAlertThresholds_id` PRIMARY KEY(`id`),
	CONSTRAINT `cropAlertThresholds_user_crop_unique` UNIQUE(`userId`,`cropName`)
);
--> statement-breakpoint
CREATE TABLE `cropCalendarReminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cropName` varchar(80) NOT NULL,
	`title` varchar(160) NOT NULL,
	`details` text,
	`dueAt` timestamp NOT NULL,
	`status` enum('upcoming','completed') NOT NULL DEFAULT 'upcoming',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cropCalendarReminders_id` PRIMARY KEY(`id`)
);
