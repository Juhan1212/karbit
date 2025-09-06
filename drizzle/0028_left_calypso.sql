ALTER TABLE "positions" ALTER COLUMN "kr_volume" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "kr_funds" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "kr_fee" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "fr_volume" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "fr_funds" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "fr_fee" SET DATA TYPE numeric(18, 8);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "profit" SET DATA TYPE numeric(18, 2);