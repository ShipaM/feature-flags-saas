CREATE INDEX "api_keys_project_id_idx" ON "api_keys" ("project_id");--> statement-breakpoint
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs" ("organization_id");--> statement-breakpoint
CREATE INDEX "users_organization_id_idx" ON "users" ("organization_id");