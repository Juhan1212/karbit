ALTER TABLE "positions" ALTER COLUMN "kr_price" SET DATA TYPE numeric(10, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "kr_volume" SET DATA TYPE numeric(10, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "kr_funds" SET DATA TYPE numeric(10, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "kr_fee" SET DATA TYPE numeric(10, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "fr_price" SET DATA TYPE numeric(10, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "fr_volume" SET DATA TYPE numeric(10, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "fr_funds" SET DATA TYPE numeric(10, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "fr_fee" SET DATA TYPE numeric(10, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "entry_rate" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "exit_rate" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "profit" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "profit_rate" SET DATA TYPE numeric(10, 2);