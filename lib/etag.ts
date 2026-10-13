import { createHash } from "node:crypto";

//Strong ETag derived from the exact response body: same body -> same ETag.
export function etagFor(body: string): string {
  const digest = createHash("sha256").update(body).digest("base64url");
  return `"${digest.slice(0, 27)}"`; // quotes are part of the ETag syntax
}

// Does the request's If-None-Match header contain our ETag?
// Handles "*", a comma-separated list, and weak validators (W/"...").
export function ifNoneMatchHas(header: string | null, etag: string): boolean {
  if (!header) return false;

  if (header.trim() === "*") return true;

  return header
    .split(",")
    .some((candidate) => candidate.trim().replace(/^W\//, "") === etag);
}
