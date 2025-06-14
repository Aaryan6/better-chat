ALTER TABLE "Message" ALTER COLUMN "attachments" SET DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "Message" ALTER COLUMN "toolInvocations" SET DEFAULT '[]'::json;