import { z } from "zod";

// Validation for the public sign-up form. Used on the server (the real check)
// and can be reused on the client for instant hints.
export const signupSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(1, "Enter an organization name")
    .max(255, "At most 255 characters"),
  name: z
    .string()
    .trim()
    .min(1, "Enter your name")
    .max(255, "At most 255 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase() // "Me@Mail.com" and "me@mail.com" are the same person
    .max(255, "At most 255 characters")
    .pipe(z.email("Enter a valid email")),
  password: z
    .string()
    .min(12, "At least 12 characters")
    .max(128, "At most 128 characters"),
});

export type SignupInput = z.infer<typeof signupSchema>;
