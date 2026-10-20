import { z } from "zod";

export const apiKeyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a name")
    .max(100, "At most 100 characters"),
  environment: z.enum(["dev", "staging", "prod"]),
  type: z.enum(["server", "client"]),
});

export type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;
