import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "@/tests/axe";
import { SubmitButton } from "./submit-button";

// Form whose action stays pending until `resolve` is called
const renderPendingForm = () => {
  let resolve!: () => void;
  const action = () =>
    new Promise<void>((r) => {
      resolve = r;
    });

  const utils = render(
    <form action={action}>
      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>,
  );
  return { ...utils, finish: () => act(async () => resolve()) };
};

describe("SubmitButton", () => {
  it("renders an enabled submit button with its label", () => {
    render(<SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>);

    const button = screen.getByRole("button", { name: "Sign in" });

    expect(button).toHaveAttribute("type", "submit");
    expect(button).toBeEnabled();
  });

  it("shows the pending label and is disabled while the form submits", async () => {
    const { finish } = renderPendingForm();

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const button = screen.getByRole("button", { name: "Signing in…" });

    expect(button).toBeDisabled();

    await finish();
  });

  it("returns to the idle state when the action finishes", async () => {
    const { finish } = renderPendingForm();

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await finish();

    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  describe("accessibility", () => {
    it("has the label as its accessible name (icons are hidden)", () => {
      const { container } = render(
        <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>,
      );

      expect(screen.getByRole("button")).toHaveAccessibleName("Sign in");
      for (const svg of container.querySelectorAll("svg")) {
        expect(svg).toHaveAttribute("aria-hidden", "true");
      }
    });

    it("announces the pending label as its accessible name", async () => {
      const { container, finish } = renderPendingForm();

      await userEvent.click(screen.getByRole("button"));

      expect(screen.getByRole("button")).toHaveAccessibleName("Signing in…");
      for (const svg of container.querySelectorAll("svg")) {
        expect(svg).toHaveAttribute("aria-hidden", "true");
      }

      await finish();
    });

    it("has no axe violations in both states", async () => {
      const { container, finish } = renderPendingForm();

      await expectNoA11yViolations(container);

      await userEvent.click(screen.getByRole("button"));
      await expectNoA11yViolations(container);

      await finish();
    });
  });
});
