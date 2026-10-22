import { z } from "zod";
import { environmentEnum } from "@/server/db/schema";
import { id } from "./common";

// Validates the allowed environments: dev, staging, and prod.
export const environment = z.enum(environmentEnum.enumValues);

// Validates rollout percentage (integer between 0 and 100).
export const rollout = z.number().int().min(0).max(100);

// Validates the feature flag key (lowercase letters, numbers, and hyphens only).
export const flagKey = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9-]+$/);

// Validates the optional flag description (maximum 1000 characters).
export const flagDescription = z.string().max(1000);

// Validates optional filters and page params for listing flags.
export const listFlagsInput = z
  .object({
    projectId: id.optional(),
    environment: environment.optional(),
    page: z.number().int().min(1).optional(), // 1-based, default 1
    perPage: z.number().int().min(1).max(100).optional(), // default 10
  })
  .optional();

// Validates the data required to create a feature flag.
export const createFlagInput = z.object({
  projectId: id,
  key: flagKey,
  rollout: rollout.default(0),
  environment,
  description: flagDescription.optional(),
  enabled: z.boolean().default(false),
});

// Validates feature flag updates and requires at least one field to be provided.
export const updateFlagInput = z
  .object({
    id,
    description: flagDescription.nullable().optional(),
    enabled: z.boolean().optional(),
    rollout: rollout.optional(),
  })
  // Ensures that at least one field is provided for the update.
  .refine(
    (v) =>
      v.description !== undefined ||
      v.enabled !== undefined ||
      v.rollout !== undefined,
    { message: "At least one field is required" },
  );

// Validates the input containing a feature flag ID.
export const flagIdInput = z.object({ id });
