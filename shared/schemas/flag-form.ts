import { z } from "zod";

export const flagFormSchema = z.object({
  key: z
    .string()
    .min(1, "Enter a key")
    .max(255, "At most 255 characters")
    .regex(
      /^[a-z0-9_-]+$/,
      "Only lowercase letters, digits, hyphens and underscores",
    ),
  description: z.string().max(1000, "At most 1000 characters"),
  environment: z.enum(["dev", "staging", "prod"]),
  rollout: z.number().int().min(0).max(100),
  enabled: z.boolean(),
});

export type FlagFormValues = z.infer<typeof flagFormSchema>;
