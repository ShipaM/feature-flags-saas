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

// users (Better Auth "user" model + our own fields: organizationId, role)
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // --- our fields (Better Auth does not know about them) ---
  organizationId: integer("organization_id")
    .references(() => organizations.id)
    .notNull(),
  role: userRoleEnum("role").notNull().default("developer"),
  // --- fields required by Better Auth ---
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
// sessions: one row = one logged-in browser. Delete the row -> user is logged out
export const sessions = pgTable("sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull().unique(), // the value stored in the cookie
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
// accounts: HOW the user logs in. Email+password -> providerId "credential", hash in `password`
export const accounts = pgTable("accounts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  password: text("password"), // password HASH (scrypt), only for "credential"
  // OAuth fields (GitHub, Google...). Empty for email+password
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
// verifications: one-time tokens (email confirmation, password reset)
export const verifications = pgTable("verifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
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
