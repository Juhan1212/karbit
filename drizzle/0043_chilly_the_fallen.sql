CREATE TABLE IF NOT EXISTS "telegram_auth_tokens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "telegram_auth_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "telegram_auth_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_chat_id" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_username" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_connected_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "telegram_notifications_enabled" boolean DEFAULT true;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "telegram_auth_tokens" ADD CONSTRAINT "telegram_auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_telegram_auth_tokens_token" ON "telegram_auth_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_telegram_auth_tokens_user" ON "telegram_auth_tokens" USING btree ("user_id");