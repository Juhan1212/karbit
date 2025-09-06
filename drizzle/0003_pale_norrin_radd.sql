CREATE TABLE IF NOT EXISTS "password_resets" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "password_resets_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(255) NOT NULL,
	"verification_code" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_password_resets_email" ON "password_resets" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_password_resets_code" ON "password_resets" USING btree ("verification_code");