ALTER TABLE "positions" ALTER COLUMN "kr_price" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "fr_price" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "strategies" ALTER COLUMN "seed_amount" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "strategies" ALTER COLUMN "entry_rate" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "strategies" ALTER COLUMN "exit_rate" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "total_order_amount" SET DATA TYPE numeric(18, 8);