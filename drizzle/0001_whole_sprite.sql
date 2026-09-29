CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`room` enum('public','private') NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int,
	`text` text NOT NULL,
	`attachmentUrl` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `local_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`displayName` varchar(80) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `local_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `local_accounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `local_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `local_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `local_sessions_tokenHash_unique` UNIQUE(`tokenHash`)
);
