import { createHash, randomBytes } from "node:crypto";
import type { environmentEnum } from "@/server/db/schema";

type Environment = (typeof environmentEnum.enumValues)[number];

// Every key starts with this prefix, so humans and secret scanners can recognise it.
export const API_KEY_PREFIX = "ffk";

// 32 random bytes = 256 bits of entropy.
const SECRET_BYTES = 32;

// 43 base64url characters = 32 bytes of entropy.
const SECRET_LENGTH = 43;

// "ffk_prod_" + 4 characters of the secret: enough to tell keys apart in a list.
const DISPLAY_SECRET_CHARS = 4;

// Shape: ffk_<environment>_<43 base64url characters>
const API_KEY_PATTERN = new RegExp(
  `^${API_KEY_PREFIX}_(dev|staging|prod)_[A-Za-z0-9_-]{${SECRET_LENGTH}}$`,
);

/** SHA-256 as hex (64 chars). Deterministic, so we can look a key up by its hash. */
export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/** Create a new key. `plaintext` must be shown to the user once and never stored. */
export function generateApiKey(environment: Environment) {
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const plaintext = `${API_KEY_PREFIX}_${environment}_${secret}`;
  return {
    plaintext,
    hashedKey: hashApiKey(plaintext),
    keyPrefix: plaintext.slice(
      0,
      API_KEY_PREFIX.length + environment.length + 2 + DISPLAY_SECRET_CHARS,
    ),
  };
}

/** Cheap format check: rejects garbage before we spend a database query on it. */
export function isWellFormedApiKey(value: string): boolean {
  return API_KEY_PATTERN.test(value);
}

/** "Authorization: Bearer <token>" -> "<token>", or null if the header is missing/invalid. */
export function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  // The scheme name is case-insensitive (RFC 9110), the token is not.
  const match = /^Bearer +(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}
