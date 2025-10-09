CREATE TABLE IF NOT EXISTS "exchange_news" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exchange_news_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"summary" text,
	"content" text,
	"exchange" varchar(50) NOT NULL,
	"type" varchar(20) NOT NULL,
	"coin_symbol" varchar(20),
	"original_url" text NOT NULL,
	"published_at" timestamp NOT NULL,
	"scraped_at" timestamp DEFAULT now() NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT true,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "exchange_news_content_hash_unique" UNIQUE("content_hash"),
	CONSTRAINT "type_check" CHECK ("exchange_news"."type" IN ('listing', 'delisting', 'announcement'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exchange_news_exchange" ON "exchange_news" USING btree ("exchange");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exchange_news_type" ON "exchange_news" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exchange_news_published" ON "exchange_news" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exchange_news_scraped" ON "exchange_news" USING btree ("scraped_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exchange_news_coin_symbol" ON "exchange_news" USING btree ("coin_symbol");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exchange_news_active" ON "exchange_news" USING btree ("is_active");