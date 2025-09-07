ALTER TABLE "strategies" ALTER COLUMN "user_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "strategies" ALTER COLUMN "user_id" SET NOT NULL;