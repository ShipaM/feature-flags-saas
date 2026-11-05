import { afterEach, describe, expect, it, vi } from "vitest";

import { SafeWriter, safeQueryLogger } from "./safeLogger";

afterEach(() => vi.restoreAllMocks());

describe("safe drizzle logger", () => {
  it("SafeWriter drops everything after ' -- params:'", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    new SafeWriter().write('Query: select 1 -- params: ["secret-token"]');

    expect(log).toHaveBeenCalledWith("Query: select 1");
  });

  it("a real logQuery call never prints parameter values", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    safeQueryLogger().logQuery('select * from "sessions" where "token" = $1', [
      "secret-token",
    ]);

    const printed = JSON.stringify(log.mock.calls);

    expect(printed).toContain("select * from");
    expect(printed).not.toContain("secret-token");
    expect(printed).not.toContain("params");
  });
});
