DROP INDEX IF EXISTS "idx_exchange_news_active";--> statement-breakpoint
ALTER TABLE "exchange_news" DROP COLUMN IF EXISTS "summary";--> statement-breakpoint
ALTER TABLE "exchange_news" DROP COLUMN IF EXISTS "is_active";--> statement-breakpoint
ALTER TABLE "exchange_news" DROP COLUMN IF EXISTS "metadata";