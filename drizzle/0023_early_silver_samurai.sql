ALTER TABLE "positions" ALTER COLUMN "entry_time" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "entry_time" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "kr_exchange" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "fr_exchange" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "profit" numeric(10, 6) NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "profit_rate" numeric(10, 6) NOT NULL;