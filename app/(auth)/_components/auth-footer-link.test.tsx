import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "@/tests/axe";
import { AuthFooterLink } from "./auth-footer-link";

const renderLink = () =>
  render(
    <p>
      <AuthFooterLink
        text="No account yet?"
        href="/signup"
        label="Create one"
      />
    </p>,
  );

describe("AuthFooterLink", () => {
  it("renders the text followed by a link", () => {
    const { container } = renderLink();

    expect(container).toHaveTextContent("No account yet? Create one");
  });

  it("links to the given href", () => {
    renderLink();

    expect(screen.getByRole("link", { name: "Create one" })).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  describe("accessibility", () => {
    it("names the link by its label only, not by the leading text", () => {
      renderLink();

      expect(screen.getByRole("link")).toHaveAccessibleName("Create one");
    });

    it("has no axe violations", async () => {
      const { container } = renderLink();

      await expectNoA11yViolations(container);
    });
  });
});
