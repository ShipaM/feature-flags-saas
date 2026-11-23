import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "@/tests/axe";
import AuthLayout from "./layout";

const renderLayout = () =>
  render(
    <AuthLayout params={Promise.resolve({})}>
      <main>
        <h1>Page content</h1>
      </main>
    </AuthLayout>,
  );

describe("AuthLayout", () => {
  it("renders the page content", () => {
    renderLayout();

    expect(
      screen.getByRole("heading", { name: "Page content" }),
    ).toBeInTheDocument();
  });

  it("puts the theme toggle in the header", () => {
    renderLayout();

    expect(screen.getByRole("banner")).toContainElement(
      screen.getByRole("button", { name: "Toggle theme" }),
    );
  });

  describe("accessibility", () => {
    it("hides the decorative background from assistive technology", () => {
      const { container } = renderLayout();

      const background = container.querySelector(".pointer-events-none");

      expect(background).toHaveAttribute("aria-hidden", "true");
    });

    it("has no axe violations", async () => {
      const { container } = renderLayout();

      await expectNoA11yViolations(container);
    });
  });
});
