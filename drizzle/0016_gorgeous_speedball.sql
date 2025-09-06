ALTER TABLE "positions" ADD COLUMN "coin_symbol" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "size" numeric(18, 8) NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "leverage" integer DEFAULT 1 NOT NULL;