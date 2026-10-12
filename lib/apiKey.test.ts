import { describe, it, expect } from "vitest";
import {
  API_KEY_PREFIX,
  extractBearerToken,
  generateApiKey,
  hashApiKey,
  isWellFormedApiKey,
} from "./apiKey";

const ENVIRONMENTS = ["dev", "staging", "prod"] as const;
const SECRET = "A".repeat(43);

describe("hashApiKey", () => {
  it("produces the known SHA-256 reference values", () => {
    expect(hashApiKey("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(hashApiKey("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is deterministic and returns 64 lowercase hex characters", () => {
    const hash = hashApiKey("ffk_prod_something");
    expect(hashApiKey("ffk_prod_something")).toBe(hash);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gives different hashes for different inputs", () => {
    expect(hashApiKey("key-1")).not.toBe(hashApiKey("key-2"));
  });
});

describe("generateApiKey", () => {
  it.each(ENVIRONMENTS)("builds a well-formed key for %s", (env) => {
    const { plaintext } = generateApiKey(env);
    expect(plaintext.startsWith(`${API_KEY_PREFIX}_${env}_`)).toBe(true);
    expect(isWellFormedApiKey(plaintext)).toBe(true);
  });

  it("uses a 43-character base64url secret", () => {
    const { plaintext } = generateApiKey("prod");
    const secret = plaintext.slice(`${API_KEY_PREFIX}_prod_`.length);
    expect(secret).toHaveLength(43);
    expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("returns the hash of the plaintext", () => {
    const { plaintext, hashedKey } = generateApiKey("dev");
    expect(hashedKey).toBe(hashApiKey(plaintext));
  });

  it.each(ENVIRONMENTS)(
    "keyPrefix is the visible start of the key for %s",
    (env) => {
      const { plaintext, keyPrefix } = generateApiKey(env);
      expect(keyPrefix).toHaveLength(`${API_KEY_PREFIX}_${env}_`.length + 4);
      expect(plaintext.startsWith(keyPrefix)).toBe(true);
    },
  );

  it("does not leak the full secret through keyPrefix or hashedKey", () => {
    const { plaintext, keyPrefix, hashedKey } = generateApiKey("prod");
    const secret = plaintext.slice(`${API_KEY_PREFIX}_prod_`.length);
    expect(keyPrefix).not.toContain(secret);
    expect(hashedKey).not.toContain(secret);
  });

  it("generates unique keys", () => {
    const keys = new Set<string>();
    const hashes = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const { plaintext, hashedKey } = generateApiKey("prod");
      keys.add(plaintext);
      hashes.add(hashedKey);
    }
    expect(keys.size).toBe(500);
    expect(hashes.size).toBe(500);
  });
});

describe("isWellFormedApiKey", () => {
  it.each(ENVIRONMENTS)("accepts a valid %s key", (env) => {
    expect(isWellFormedApiKey(`ffk_${env}_${SECRET}`)).toBe(true);
  });

  it("accepts '-' and '_' inside the secret", () => {
    expect(isWellFormedApiKey(`ffk_prod_${"a-_".repeat(14)}a`)).toBe(true);
  });

  it.each([
    ["empty string", ""],
    ["wrong prefix", `abc_prod_${SECRET}`],
    ["unknown environment", `ffk_test_${SECRET}`],
    ["uppercase environment", `ffk_PROD_${SECRET}`],
    ["missing environment", `ffk_${SECRET}`],
    ["secret too short", `ffk_prod_${"A".repeat(42)}`],
    ["secret too long", `ffk_prod_${"A".repeat(44)}`],
    ["illegal character in secret", `ffk_prod_${"A".repeat(42)}+`],
    ["base64 padding", `ffk_prod_${"A".repeat(42)}=`],
    ["leading whitespace", ` ffk_prod_${SECRET}`],
    ["trailing whitespace", `ffk_prod_${SECRET} `],
    ["trailing newline", `ffk_prod_${SECRET}\n`],
    ["two keys glued together", `ffk_prod_${SECRET}ffk_prod_${SECRET}`],
  ])("rejects: %s", (_name, value) => {
    expect(isWellFormedApiKey(value)).toBe(false);
  });
});

describe("extractBearerToken", () => {
  it("extracts the token from a Bearer header", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
  });

  it("treats the scheme name as case-insensitive", () => {
    expect(extractBearerToken("bearer abc123")).toBe("abc123");
    expect(extractBearerToken("BEARER abc123")).toBe("abc123");
  });

  it("keeps the token case untouched", () => {
    expect(extractBearerToken("Bearer AbC-dEf_123")).toBe("AbC-dEf_123");
  });

  it("tolerates several spaces and surrounding whitespace", () => {
    expect(extractBearerToken("Bearer    abc123")).toBe("abc123");
    expect(extractBearerToken("  Bearer abc123  ")).toBe("abc123");
  });

  it("round-trips a generated key", () => {
    const { plaintext } = generateApiKey("staging");
    expect(extractBearerToken(`Bearer ${plaintext}`)).toBe(plaintext);
  });

  it.each([
    ["null header", null],
    ["empty header", ""],
    ["whitespace only", "   "],
    ["scheme without token", "Bearer"],
    ["scheme with only spaces", "Bearer   "],
    ["another scheme", "Basic dXNlcjpwYXNz"],
    ["no scheme", "abc123"],
    ["token with inner whitespace", "Bearer abc def"],
    ["scheme glued to token", "Bearerabc123"],
  ])("returns null for: %s", (_name, header) => {
    expect(extractBearerToken(header)).toBeNull();
  });
});
