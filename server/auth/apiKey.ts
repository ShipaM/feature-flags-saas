import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import {
  extractBearerToken,
  hashApiKey,
  isWellFormedApiKey,
} from "@/lib/apiKey";
import {
  getCachedApiKey,
  getStaleApiKey,
  setCachedApiKey,
} from "@/server/cache/apiKeys";
import { db } from "@/server/db";
import { isDbUnavailable } from "@/server/db/errors";
import { apiKeys } from "@/server/db/schema";
import { logSecurityEvent } from "@/server/security/log";

export type ApiKeyAuth = {
  keyId: number;
  projectId: number;
  environment: (typeof apiKeys.$inferSelect)["environment"];
};

// Authenticates a machine client by "Authorization: Bearer <key>".
// Returns the project + environment the key is bound to, or null.
// We never say WHY it failed (unknown / revoked / malformed): that would help an attacker.
export async function authenticateApiKey(
  request: Request,
): Promise<ApiKeyAuth | null> {
  const token = extractBearerToken(request.headers.get("authorization"));

  if (!token || !isWellFormedApiKey(token)) return null; // no DB query for garbage

  const hash = hashApiKey(token);

  const cached = await getCachedApiKey(hash);
  if (cached) return cached;

  let row: ApiKeyAuth | undefined;

  try {
    [row] = await db
      .select({
        keyId: apiKeys.id,
        projectId: apiKeys.projectId,
        environment: apiKeys.environment,
      })
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.hashedKey, hash), // lookup by hash (unique index)
          isNull(apiKeys.revokedAt), // revoked keys stop working immediately
        ),
      )
      .limit(1);
  } catch (error) {
    if (isDbUnavailable(error)) {
      const stale = await getStaleApiKey(hash);
      if (stale) {
        logSecurityEvent("served_stale", { what: "api_key" });
        return stale;
      }
    }
    throw error;
  }

  if (row) await setCachedApiKey(hash, row);
  return row ?? null;
}
