ALTER TABLE "coins_exchanges" ADD COLUMN "deposit_yn" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "coins_exchanges" ADD COLUMN "withdraw_yn" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "coins_exchanges" DROP COLUMN IF EXISTS "dw_pos_yn";