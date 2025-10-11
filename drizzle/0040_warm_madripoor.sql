ALTER TABLE "users" ADD COLUMN "total_self_entry_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_auto_entry_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_alarm_count" integer DEFAULT 0;