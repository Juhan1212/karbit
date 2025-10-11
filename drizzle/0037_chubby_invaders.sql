CREATE TABLE IF NOT EXISTS "community_post_dislikes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "community_post_dislikes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "community_post_dislikes_post_id_user_id_unique" UNIQUE("post_id","user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "community_post_dislikes" ADD CONSTRAINT "community_post_dislikes_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "community_post_dislikes" ADD CONSTRAINT "community_post_dislikes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_post_dislikes_post" ON "community_post_dislikes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_community_post_dislikes_user" ON "community_post_dislikes" USING btree ("user_id");