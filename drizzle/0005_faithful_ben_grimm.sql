ALTER TABLE "plans" ADD COLUMN "period" varchar(20) DEFAULT '월';--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "features" text[];--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "limitations" text[];--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "is_popular" boolean DEFAULT false;