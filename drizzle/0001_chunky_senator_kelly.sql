CREATE TABLE `print_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_id` text NOT NULL,
	`file_name` text NOT NULL,
	`page_count` integer NOT NULL,
	`color` integer DEFAULT false NOT NULL,
	`duplex` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'ready_to_release' NOT NULL,
	`printer_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`released_at` text,
	`completed_at` text,
	FOREIGN KEY (`printer_id`) REFERENCES `printers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "page_count_positive" CHECK("print_jobs"."page_count" > 0)
);
--> statement-breakpoint
CREATE TABLE `printers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`library_location` text NOT NULL,
	`is_offline` integer DEFAULT false NOT NULL,
	`paper_level` text DEFAULT 'ok' NOT NULL
);
