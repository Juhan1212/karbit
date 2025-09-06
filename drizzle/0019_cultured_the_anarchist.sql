ALTER TABLE "strategies" ADD COLUMN "total_order_amount" numeric(18, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "strategies" DROP COLUMN IF EXISTS "remaining_seed";