ALTER TABLE "exchanges" ADD COLUMN "eng_name" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_eng_name_unique" UNIQUE("eng_name");