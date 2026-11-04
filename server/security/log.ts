type SecurityEvent = "api_key_rejected" | "rate_limited" | "db_unavailable";

export function logSecurityEvent(
  event: SecurityEvent,
  data: Record<string, string | number> = {},
) {
  console.warn(
    JSON.stringify({
      level: "warn",
      event,
      ...data,
      at: new Date().toISOString(),
    }),
  );
}
