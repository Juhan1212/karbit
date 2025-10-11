ALTER TABLE "users" ADD COLUMN "last_entry_date" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "daily_entry_count" integer DEFAULT 0;