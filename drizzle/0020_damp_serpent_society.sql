ALTER TABLE "users" ADD COLUMN "total_entry_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_order_amount" numeric(18, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "strategies" DROP COLUMN IF EXISTS "total_order_amount";