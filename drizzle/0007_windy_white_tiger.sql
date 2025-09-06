ALTER TABLE "strategies" ADD COLUMN "is_active" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "seed_amount" numeric(18, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "coin_mode" varchar(10) DEFAULT 'custom' NOT NULL;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "selected_coins" text[];--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "entry_rate" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "exit_rate" numeric(10, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "seed_division" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "allow_average_down" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "allow_average_up" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "ai_mode" varchar(20);--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "webhook_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "telegram_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "portfolio_rebalancing" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active_strategy_id" integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_strategies_active" ON "strategies" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "strategies" DROP COLUMN IF EXISTS "seed";--> statement-breakpoint
ALTER TABLE "strategies" DROP COLUMN IF EXISTS "entry_premium";--> statement-breakpoint
ALTER TABLE "strategies" DROP COLUMN IF EXISTS "exit_premium";--> statement-breakpoint
ALTER TABLE "strategies" DROP COLUMN IF EXISTS "leverage";--> statement-breakpoint
ALTER TABLE "strategies" ADD CONSTRAINT "coin_mode_check" CHECK ("strategies"."coin_mode" IN ('auto', 'custom'));--> statement-breakpoint
ALTER TABLE "strategies" ADD CONSTRAINT "ai_mode_check" CHECK ("strategies"."ai_mode" IS NULL OR "strategies"."ai_mode" IN ('conservative', 'balanced', 'aggressive'));