ALTER TABLE "Message" ALTER COLUMN "attachments" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "toolInvocations" json;