import { z } from "zod";
import { environmentEnum } from "@/server/db/schema";
import { id } from "./common";

// Allowed environments: dev, staging, prod
export const environment = z.enum(environmentEnum.enumValues);

// Allowed rollout values: 0-100
export const rollout = z.number().int().min(0).max(100);

export const flagKey = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9-]+$/);

export const flagDescription = z.string().max(1000);

export const listFlagsInput = z
  .object({
    projectId: id.optional(),
    environment: environment.optional(),
  })
  .optional();

export const createFlagInput = z.object({
  projectId: id,
  key: flagKey,
  rollout: rollout.default(0),
  environment,
  description: flagDescription.optional(),
  enabled: z.boolean().default(false),
});

export const updateFlagInput = z
  .object({
    id,
    description: flagDescription.nullable().optional(),
    enabled: z.boolean().optional(),
    rollout: rollout.optional(),
  })
  // At least one field is required
  .refine(
    (v) =>
      v.description !== undefined ||
      v.enabled !== undefined ||
      v.rollout !== undefined,
    { message: "At least one field is required" },
  );

export const flagIdInput = z.object({ id });
