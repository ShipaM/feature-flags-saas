import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "@/tests/axe";
import { AuthCard } from "./auth-card";

const renderCard = (props: Partial<Parameters<typeof AuthCard>[0]> = {}) =>
  render(
    <AuthCard
      title="Welcome back"
      description="Sign in to continue"
      footer={<span>Footer text</span>}
      action={vi.fn<(formData: FormData) => void>()}
      pending={false}
      {...props}
    >
      <label htmlFor="email">Email</label>
      <input id="email" name="email" />
      <button type="submit">Submit</button>
    </AuthCard>,
  );

describe("AuthCard", () => {
  it("renders the title as the page heading and the description", () => {
    renderCard();

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sign in to continue")).toBeInTheDocument();
  });

  it("renders children inside the form and the footer below it", () => {
    renderCard();

    const form = screen.getByRole("form");

    expect(form).toContainElement(screen.getByLabelText("Email"));
    expect(form).not.toContainElement(screen.getByText("Footer text"));
  });

  it("disables native validation so the server error is shown instead", () => {
    renderCard();

    expect(screen.getByRole("form")).toHaveAttribute("novalidate");
  });

  it("calls the action with the form data on submit", async () => {
    const action = vi.fn<(formData: FormData) => void>();

    renderCard({ action });

    await userEvent.type(screen.getByLabelText("Email"), "me@acme.com");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(action).toHaveBeenCalledOnce();

    const formData = action.mock.calls[0][0];

    expect(formData.get("email")).toBe("me@acme.com");
  });

  describe("accessibility", () => {
    it("names the form by the title and describes it by the description", () => {
      renderCard();

      const form = screen.getByRole("form", { name: "Welcome back" });

      expect(form).toHaveAccessibleDescription("Sign in to continue");
    });

    it.each([
      [false, "false"],
      [true, "true"],
    ])("sets aria-busy=%s while pending", (pending, expected) => {
      renderCard({ pending });

      expect(screen.getByRole("form")).toHaveAttribute("aria-busy", expected);
    });

    it("hides decorative elements from assistive technology", () => {
      const { container } = renderCard();

      for (const svg of container.querySelectorAll("svg")) {
        expect(svg).toHaveAttribute("aria-hidden", "true");
      }
    });

    it("uses unique ids when two cards are on the page", () => {
      render(
        <>
          <AuthCard
            title="A"
            description="a"
            footer={null}
            action={vi.fn<(formData: FormData) => void>()}
            pending={false}
          >
            {null}
          </AuthCard>
          <AuthCard
            title="B"
            description="b"
            footer={null}
            action={vi.fn<(formData: FormData) => void>()}
            pending={false}
          >
            {null}
          </AuthCard>
        </>,
      );

      expect(
        screen.getByRole("form", { name: "A" }),
      ).toHaveAccessibleDescription("a");
      expect(
        screen.getByRole("form", { name: "B" }),
      ).toHaveAccessibleDescription("b");
    });

    it("has no axe violations", async () => {
      const { container } = renderCard();

      await expectNoA11yViolations(container);
    });
  });
});
