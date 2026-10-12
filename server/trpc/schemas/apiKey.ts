import { z } from "zod";
import { id } from "./common";
import { environment } from "./flag";

// "server" keys live on your backend. "client" keys ship inside browser/mobile apps.
export const apiKeyType = z.enum(["server", "client"]);

export const listApiKeysInput = z
  .object({ projectId: id.optional() })
  .optional();

export const createApiKeyInput = z.object({
  projectId: id,
  environment,
  name: z.string().trim().min(1).max(100),
  type: apiKeyType.default("server"),
});

export const apiKeyIdInput = z.object({ id });
