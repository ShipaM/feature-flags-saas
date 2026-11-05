import { describe, expect, it } from "vitest";
import { isDbUnavailable } from "./errors";

describe("isDbUnavailable", () => {
  it("detects connection errors, also when wrapped in `cause`", () => {
    expect(isDbUnavailable({ code: "ECONNREFUSED" })).toBe(true);
    expect(isDbUnavailable({ cause: { code: "CONNECTION_CLOSED" } })).toBe(true);
    expect(isDbUnavailable({ cause: { cause: { code: "08006" } } })).toBe(true);
  });

  it("does not treat other errors as an outage", () => {
    expect(isDbUnavailable({ code: "23505" })).toBe(false); // unique violation
    expect(isDbUnavailable(new Error("boom"))).toBe(false);
    expect(isDbUnavailable(null)).toBe(false);
  });
});
