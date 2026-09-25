import { z } from "zod";

// No `import "server-only"` here: seed.ts (run by tsx, outside Next.js) imports db/client, which imports this file.
// Never import it from Client Components: it holds secrets (Next.js won't inline them, they'd just be undefined there).
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32), // signs session
  BETTER_AUTH_URL: z.url(), // e.g. http://localhost:3000
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast on startup with a readable message instead of a cryptic connection error later
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;
