ALTER TABLE "strategies" DROP CONSTRAINT "ai_mode_check";--> statement-breakpoint
ALTER TABLE strategies DROP COLUMN ai_mode;
ALTER TABLE strategies ADD COLUMN ai_mode boolean DEFAULT false;