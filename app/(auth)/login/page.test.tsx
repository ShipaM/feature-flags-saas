import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "@/tests/axe";
import LoginPage from "./page";

// _components re-exports both forms, so both server actions must be mocked
vi.mock("@/app/(auth)/login/action", () => ({ loginAction: vi.fn() }));
vi.mock("@/app/(auth)/signup/action", () => ({ signupAction: vi.fn() }));

describe("LoginPage", () => {
  it("renders the login form inside the main landmark", () => {
    render(<LoginPage />);

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("form", { name: "Welcome back" }),
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(<LoginPage />);
    await expectNoA11yViolations(container);
  });
});
