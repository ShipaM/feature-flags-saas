import { describe, expect, it, vi } from "vitest";

const execute = vi.fn();
vi.mock("@/server/db", () => ({
  db: { execute: (...a: unknown[]) => execute(...a) },
}));
const getSession = vi.fn();
vi.mock("@/server/auth/session", () => ({
  getSession: (...a: unknown[]) => getSession(...a),
}));

import { createTRPCContext } from "./context";

describe("createTRPCContext when the session lookup fails", () => {
  it("DB down + better-auth error WITHOUT cause -> SERVICE_UNAVAILABLE", async () => {
    getSession.mockRejectedValue(new Error("Failed to get session")); // like better-auth
    execute.mockRejectedValue(
      Object.assign(new Error("x"), { cause: { code: "ECONNREFUSED" } }),
    );
    await expect(
      createTRPCContext({ headers: new Headers() }),
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });

  it("DB alive + another error -> the original error is rethrown", async () => {
    const boom = new Error("some bug");
    getSession.mockRejectedValue(boom);
    execute.mockResolvedValue([{ "?column?": 1 }]);
    await expect(createTRPCContext({ headers: new Headers() })).rejects.toBe(
      boom,
    );
  });

  it("DB hangs -> treated as down after 2 s", async () => {
    getSession.mockRejectedValue(new Error("Failed to get session"));
    execute.mockReturnValue(new Promise(() => {}));
    await expect(
      createTRPCContext({ headers: new Headers() }),
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  }, 6000);

  it("healthy path still returns the context", async () => {
    getSession.mockResolvedValue({ user: { id: 1 } });
    const ctx = await createTRPCContext({ headers: new Headers() });
    expect(ctx.session).toEqual({ user: { id: 1 } });
  });
});
