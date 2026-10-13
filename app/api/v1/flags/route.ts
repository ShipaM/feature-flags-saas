import { and, eq } from "drizzle-orm";
import { etagFor, ifNoneMatchHas } from "@/lib/etag";
import { authenticateApiKey } from "@/server/auth/apiKey";
import { db } from "@/server/db";
import { flags } from "@/server/db/schema";

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

// GET /api/v1/flags: raw flag data for the project + environment bound to the API key.
// It does NOT decide who gets a flag: that is the client SDK's job (see ADR-002).
export async function GET(request: Request) {
  try {
    const auth = await authenticateApiKey(request);
    if (!auth) return unauthorized();
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
    const body = JSON.stringify({
      flags: Object.fromEntries(
        rows.map((r) => [r.key, { enabled: r.enabled, rollout: r.rollout }]),
      ),
    });
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
    console.error("GET /api/v1/flags failed:", error); // details stay in the server log
    return Response.json(
      { error: "internal_error" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
