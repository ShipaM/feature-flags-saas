import { z } from "zod";
import { id } from "./common";
import { environment } from "./flag";

// Defines API key types: server-side or client-side.
export const apiKeyType = z.enum(["server", "client"]);

// Validates optional filters for listing API keys by project.
export const listApiKeysInput = z
  .object({ projectId: id.optional() })
  .optional();

// Validates the data required to create an API key.
export const createApiKeyInput = z.object({
  projectId: id,
  environment,
  name: z.string().trim().min(1).max(100),
  type: apiKeyType.default("server"),
});

// Validates the input containing an API key ID.
export const apiKeyIdInput = z.object({ id });
