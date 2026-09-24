import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

// user roles
export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "admin",
  "developer",
  "readonly",
]);

// environment
export const environmentEnum = pgEnum("environment", [
  "dev",
  "staging",
  "prod",
]);

// organizations
export const organizations = pgTable("organizations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// users
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull().default("developer"),
});

//projects
export const projects = pgTable("projects", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
});

// flags
export const flags = pgTable(
  "flags",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    projectId: integer("project_id")
      .references(() => projects.id)
      .notNull(),
    key: varchar("key", { length: 255 }).notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(false),
    rollout: integer("rollout").notNull().default(0), //0-100%
    environment: environmentEnum("environment").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("flags_project_key_env_idx").on(
      table.projectId,
      table.key,
      table.environment,
    ),
  ],
);

//api_keys
export const apiKeys = pgTable("api_keys", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  projectId: integer("project_id")
    .references(() => projects.id)
    .notNull(),
  environment: environmentEnum("environment").notNull(),
  hashedKey: varchar("hashed_key", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 255 }).notNull(), // "server" or "client"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"), //null if not revoked
});

//audit_logs
export const auditLogs = pgTable("audit_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  actorId: integer("actor_id")
    .references(() => users.id)
    .notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
