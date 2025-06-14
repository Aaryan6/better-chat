ALTER TABLE "Chat" ADD COLUMN "sharePath" text;--> statement-breakpoint
ALTER TABLE "Vote" DROP COLUMN "visibility";--> statement-breakpoint
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_sharePath_unique" UNIQUE("sharePath");