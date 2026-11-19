// Postgres unique_violation; Drizzle may wrap the driver error in `cause`
export function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

// "Database unavailable" error codes: network errors and Postgres SQLSTATE
const UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECTION_ENDED",
  "57P01",
  "57P03", // Postgres is shutting down / still starting up
  "53300", // too many connections
]);

// Drizzle hides the original error in `cause`, so walk the chain (up to 4 levels)
export function isDbUnavailable(e: unknown): boolean {
  let cur = e as { code?: string; cause?: unknown } | null | undefined;
  for (let i = 0; i < 4 && cur; i++) {
    const code = typeof cur.code === "string" ? cur.code : undefined;
    if (code && (UNAVAILABLE_CODES.has(code) || code.startsWith("08")))
      return true;
    cur = cur.cause as typeof cur;
  }
  return false;
}
