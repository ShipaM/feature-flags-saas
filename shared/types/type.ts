// Type-only import: erased at build time, so no Drizzle code reaches the client bundle
import type { environmentEnum } from "@/server/db/schema";

// "dev" | "staging" | "prod" — taken from the DB enum, so it never drifts
type Environment = (typeof environmentEnum.enumValues)[number];

export type { Environment };
