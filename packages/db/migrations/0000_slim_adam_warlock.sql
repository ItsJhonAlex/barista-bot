CREATE TYPE "public"."audit_actor" AS ENUM('operator', 'system', 'module');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"guild_id" text,
	"actor" "audit_actor" NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"target" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_modules" (
	"module_id" text PRIMARY KEY NOT NULL,
	"enabled_default" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guild_modules" (
	"guild_id" text NOT NULL,
	"module_id" text NOT NULL,
	"enabled" boolean NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schema_version" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guild_modules_guild_id_module_id_pk" PRIMARY KEY("guild_id","module_id")
);
--> statement-breakpoint
CREATE TABLE "guilds" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"icon_url" text,
	"owner_id" text NOT NULL,
	"locale" text DEFAULT 'es' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_registry" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"version" text NOT NULL,
	"category" text,
	"manifest" jsonb NOT NULL,
	"loaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module_store" (
	"module_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "module_store_module_id_guild_id_key_pk" PRIMARY KEY("module_id","guild_id","key")
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"discord_id" text PRIMARY KEY NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "global_modules" ADD CONSTRAINT "global_modules_module_id_module_registry_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module_registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_modules" ADD CONSTRAINT "guild_modules_guild_id_guilds_id_fk" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guild_modules" ADD CONSTRAINT "guild_modules_module_id_module_registry_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."module_registry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_by_guild" ON "audit_log" USING btree ("guild_id","created_at");