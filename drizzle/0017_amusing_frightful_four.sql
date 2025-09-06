ALTER TABLE "strategies" ADD COLUMN "remaining_seed" numeric(18, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "entry_count" integer DEFAULT 0;