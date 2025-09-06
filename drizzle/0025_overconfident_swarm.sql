ALTER TABLE "positions" DROP CONSTRAINT "positions_kr_order_id_coins_exchanges_id_fk";
--> statement-breakpoint
ALTER TABLE "positions" DROP CONSTRAINT "positions_fr_order_id_coins_exchanges_id_fk";
--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "kr_order_id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "fr_order_id" SET DATA TYPE varchar(100);