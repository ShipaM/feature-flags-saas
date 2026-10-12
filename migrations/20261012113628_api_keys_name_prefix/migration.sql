ALTER TABLE "api_keys" ADD COLUMN "name" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "key_prefix" varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "created_at" SET DATA TYPE timestamp USING "created_at"::timestamp;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "revoked_at" SET DATA TYPE timestamp USING "revoked_at"::timestamp;