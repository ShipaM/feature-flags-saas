// Postgres unique_violation; Drizzle may wrap the driver error in `cause`
export function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

// Коды ошибок «база недоступна»: сетевые и SQLSTATE Postgres
const UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_DESTROYED",
  "CONNECTION_ENDED",
  "57P01",
  "57P03", // Postgres выключается / ещё запускается
  "53300", // слишком много соединений
]);

// Drizzle прячет исходную ошибку в `cause`, поэтому идём по цепочке (до 4 уровней)
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
