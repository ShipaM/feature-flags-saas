import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "@/tests/axe";
import SignupPage from "./page";

// _components re-exports both forms, so both server actions must be mocked
vi.mock("@/app/(auth)/login/action", () => ({ loginAction: vi.fn() }));
vi.mock("@/app/(auth)/signup/action", () => ({ signupAction: vi.fn() }));

describe("SignupPage", () => {
  it("renders the sign-up form inside the main landmark", () => {
    render(<SignupPage />);

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("form", { name: "Create your organization" }),
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(<SignupPage />);
    await expectNoA11yViolations(container);
  });
});
