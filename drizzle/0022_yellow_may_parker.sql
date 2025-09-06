ALTER TABLE "positions" DROP CONSTRAINT "positions_entry_exchange_buy_id_coins_exchanges_id_fk";
--> statement-breakpoint
ALTER TABLE "positions" DROP CONSTRAINT "positions_entry_exchange_sell_id_coins_exchanges_id_fk";
--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "kr_order_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "kr_price" numeric(10, 6) NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "kr_volume" numeric(10, 6) NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "kr_funds" numeric(10, 6) NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "kr_fee" numeric(10, 6) NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "fr_order_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "fr_price" numeric(10, 6) NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "fr_volume" numeric(10, 6) NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "fr_funds" numeric(10, 6) NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "fr_fee" numeric(10, 6) NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "positions" ADD CONSTRAINT "positions_kr_order_id_coins_exchanges_id_fk" FOREIGN KEY ("kr_order_id") REFERENCES "public"."coins_exchanges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "positions" ADD CONSTRAINT "positions_fr_order_id_coins_exchanges_id_fk" FOREIGN KEY ("fr_order_id") REFERENCES "public"."coins_exchanges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "positions" DROP COLUMN IF EXISTS "entry_exchange_buy_id";--> statement-breakpoint
ALTER TABLE "positions" DROP COLUMN IF EXISTS "entry_exchange_sell_id";--> statement-breakpoint
ALTER TABLE "positions" DROP COLUMN IF EXISTS "size";--> statement-breakpoint
ALTER TABLE "positions" DROP COLUMN IF EXISTS "margin";