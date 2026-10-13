import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import {
  extractBearerToken,
  hashApiKey,
  isWellFormedApiKey,
} from "@/lib/apiKey";
import { db } from "@/server/db";
import { apiKeys } from "@/server/db/schema";

export type ApiKeyAuth = {
  keyId: number;
  projectId: number;
  environment: (typeof apiKeys.$inferSelect)["environment"];
};

// Authenticates a machine client by "Authorization: Bearer <key>".
//Returns the project + environment the key is bound to, or null.
//We never say WHY it failed (unknown / revoked / malformed): that would help an attacker.
export async function authenticateApiKey(
  request: Request,
): Promise<ApiKeyAuth | null> {
  const token = extractBearerToken(request.headers.get("authorization"));

  if (!token || !isWellFormedApiKey(token)) return null; // no DB query for garbage

  const [row] = await db
    .select({
      keyId: apiKeys.id,
      projectId: apiKeys.projectId,
      environment: apiKeys.environment,
    })
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.hashedKey, hashApiKey(token)), // lookup by hash (unique index)
        isNull(apiKeys.revokedAt), // revoked keys stop working immediately
      ),
    )
    .limit(1);

  return row ?? null;
}
