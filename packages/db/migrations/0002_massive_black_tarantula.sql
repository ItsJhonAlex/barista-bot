CREATE TYPE "public"."mod_action_type" AS ENUM('warn', 'timeout', 'untimeout', 'kick', 'ban', 'unban', 'purge');--> statement-breakpoint
CREATE TABLE "mod_actions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"type" "mod_action_type" NOT NULL,
	"target_user_id" text NOT NULL,
	"moderator_id" text NOT NULL,
	"reason" text,
	"expires_at" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mod_actions" ADD CONSTRAINT "mod_actions_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mod_by_guild_user" ON "mod_actions" USING btree ("guild_id","target_user_id");