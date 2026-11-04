import { and, eq } from "drizzle-orm";
import { etagFor, ifNoneMatchHas } from "@/lib/etag";
import { authenticateApiKey } from "@/server/auth/apiKey";
import { getCachedFlags, setCachedFlags } from "@/server/cache/flags";
import { checkRateLimit, type RateLimitResult } from "@/server/cache/rateLimit";
import {
  FAILED_AUTH_LIMIT,
  FAILED_AUTH_WINDOW_SECONDS,
  FLAGS_RATE_LIMIT,
  FLAGS_RATE_WINDOW_SECONDS,
} from "@/server/constants/rateLimit";
import { db } from "@/server/db";
import { flags } from "@/server/db/schema";
import { logSecurityEvent } from "@/server/security/log";
import { isDbUnavailable } from "@/server/db/errors";

// The answer depends on the Authorization header, so it is `private` (browser/SDK cache only,
// never a shared CDN). Fresh for 30s, then usable for 60s more while the client revalidates.
const CACHE_CONTROL = "private, max-age=30, stale-while-revalidate=60";

function unauthorized() {
  return Response.json(
    { error: "invalid_api_key" },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="feature-flags"',
        "Cache-Control": "no-store", // never cache an error
      },
    },
  );
}

function tooManyRequests(r: RateLimitResult) {
  return Response.json(
    { error: "rate_limited" },
    {
      status: 429,
      headers: {
        "Retry-After": String(r.retryAfterSeconds),
        "X-RateLimit-Limit": String(r.limit),
        "X-RateLimit-Remaining": "0",
        "Cache-Control": "no-store",
      },
    },
  );
}

// GET /api/v1/flags: raw flag data for the project + environment bound to the API key.
// It does NOT decide who gets a flag: that is the client SDK's job (see ADR-002).
export async function GET(request: Request) {
  try {
    const auth = await authenticateApiKey(request);

    if (!auth) {
      // Failed auth: limit by IP to slow down key guessing
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        "unknown";
      const r = await checkRateLimit(
        `ip:${ip}`,
        FAILED_AUTH_LIMIT,
        FAILED_AUTH_WINDOW_SECONDS,
      );
      logSecurityEvent("api_key_rejected", { ip });
      return r.allowed ? unauthorized() : tooManyRequests(r);
    }

    // Right after successful auth, BEFORE reading cache/DB: limit per key
    const rl = await checkRateLimit(
      `key:${auth.keyId}`,
      FLAGS_RATE_LIMIT,
      FLAGS_RATE_WINDOW_SECONDS,
    );
    if (!rl.allowed) {
      logSecurityEvent("rate_limited", { keyId: auth.keyId });
      return tooManyRequests(rl);
    }

    // 1. Try Redis first. null = miss.
    let body = await getCachedFlags(auth.projectId, auth.environment);

    if (body === null) {
      // 2. Miss: read from Postgres exactly as before
      const rows = await db
        .select({
          key: flags.key,
          enabled: flags.enabled,
          rollout: flags.rollout,
        })
        .from(flags)
        .where(
          // BOTH come from the key's row in the database, never from the request
          and(
            eq(flags.projectId, auth.projectId),
            eq(flags.environment, auth.environment),
          ),
        )
        .orderBy(flags.key); // stable order -> stable body -> stable ETag

      body = JSON.stringify({
        flags: Object.fromEntries(
          rows.map((r) => [r.key, { enabled: r.enabled, rollout: r.rollout }]),
        ),
      });

      // 3. Remember the answer for the next requests (TTL 60 s)
      await setCachedFlags(auth.projectId, auth.environment, body);
    }

    // body is a string both after a hit and after a miss
    const etag = etagFor(body);

    const headers = {
      ETag: etag,
      "Cache-Control": CACHE_CONTROL,
      Vary: "Authorization",
    };
    // The client already has this exact version: send headers only (304, no body)

    if (ifNoneMatchHas(request.headers.get("if-none-match"), etag)) {
      return new Response(null, { status: 304, headers });
    }
    return new Response(body, {
      status: 200,
      headers: {
        ...headers,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    // БД недоступна: это не баг, а временный сбой -> 503 + «повторите через 5 с»
    if (isDbUnavailable(error)) {
      logSecurityEvent("db_unavailable", { route: "GET /api/v1/flags" });
      return Response.json(
        { error: "service_unavailable" },
        {
          status: 503,
          headers: { "Retry-After": "5", "Cache-Control": "no-store" },
        },
      );
    }
    // Всё остальное — настоящий баг. Логируем только сообщение, не весь объект
    console.error("GET /api/v1/flags failed:", (error as Error).message);
    return Response.json(
      { error: "internal_error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
