CREATE TABLE IF NOT EXISTS "coins_exchanges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "coins_exchanges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"exchange_id" integer NOT NULL,
	"coin_symbol" varchar(20) NOT NULL,
	"coin_name" varchar(50),
	CONSTRAINT "coins_exchanges_exchange_id_coin_symbol_unique" UNIQUE("exchange_id","coin_symbol")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchanges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "exchanges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(50) NOT NULL,
	"type" varchar(20) NOT NULL,
	"referral_code" varchar(100),
	"api_base_url" text,
	CONSTRAINT "exchanges_name_unique" UNIQUE("name"),
	CONSTRAINT "type_check" CHECK ("exchanges"."type" IN ('KR', 'Overseas'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(50) NOT NULL,
	"description" text,
	"price" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "plans_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "positions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "positions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"strategy_id" integer NOT NULL,
	"entry_exchange_buy_id" integer NOT NULL,
	"entry_exchange_sell_id" integer NOT NULL,
	"entry_rate" numeric(10, 6) NOT NULL,
	"exit_rate" numeric(10, 6),
	"entry_time" timestamp NOT NULL,
	"exit_time" timestamp,
	"status" varchar(20) DEFAULT 'OPEN',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "status_check" CHECK ("positions"."status" IN ('OPEN', 'CLOSED'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "strategies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(100) NOT NULL,
	"seed" numeric(18, 8) NOT NULL,
	"entry_premium" numeric(10, 6) NOT NULL,
	"exit_premium" numeric(10, 6) NOT NULL,
	"leverage" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trades" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trades_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"position_id" integer NOT NULL,
	"exchange_coin_id" integer NOT NULL,
	"side" varchar(4) NOT NULL,
	"price" numeric(18, 8) NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"fee" numeric(18, 8),
	"trade_time" timestamp NOT NULL,
	CONSTRAINT "side_check" CHECK ("trades"."side" IN ('BUY', 'SELL'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_exchanges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_exchanges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"exchange_id" integer NOT NULL,
	"api_key" text,
	"api_secret" text,
	"is_active" boolean DEFAULT true,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_exchanges_user_id_exchange_id_unique" UNIQUE("user_id","exchange_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "user_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(100),
	"plan_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "coins_exchanges" ADD CONSTRAINT "coins_exchanges_exchange_id_exchanges_id_fk" FOREIGN KEY ("exchange_id") REFERENCES "public"."exchanges"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "positions" ADD CONSTRAINT "positions_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "positions" ADD CONSTRAINT "positions_entry_exchange_buy_id_coins_exchanges_id_fk" FOREIGN KEY ("entry_exchange_buy_id") REFERENCES "public"."coins_exchanges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "positions" ADD CONSTRAINT "positions_entry_exchange_sell_id_coins_exchanges_id_fk" FOREIGN KEY ("entry_exchange_sell_id") REFERENCES "public"."coins_exchanges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trades" ADD CONSTRAINT "trades_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trades" ADD CONSTRAINT "trades_exchange_coin_id_coins_exchanges_id_fk" FOREIGN KEY ("exchange_coin_id") REFERENCES "public"."coins_exchanges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_exchanges" ADD CONSTRAINT "user_exchanges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_exchanges" ADD CONSTRAINT "user_exchanges_exchange_id_exchanges_id_fk" FOREIGN KEY ("exchange_id") REFERENCES "public"."exchanges"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_positions_strategy" ON "positions" USING btree ("strategy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_positions_status" ON "positions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trades_position" ON "trades" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trades_exchange_coin" ON "trades" USING btree ("exchange_coin_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_exchanges_user" ON "user_exchanges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_sessions_token" ON "user_sessions" USING btree ("token");