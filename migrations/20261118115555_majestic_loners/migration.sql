DROP INDEX "audit_logs_organization_id_idx";--> statement-breakpoint
CREATE INDEX "audit_logs_organization_id_id_idx" ON "audit_logs" ("organization_id","id");--> statement-breakpoint
ALTER TABLE "flags" ADD CONSTRAINT "flags_rollout_range" CHECK ("rollout" BETWEEN 0 AND 100);