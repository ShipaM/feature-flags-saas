import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "@/tests/axe";
import { FormError } from "./form-error";

describe("FormError", () => {
  it.each([undefined, ""])("renders nothing for message=%j", (message) => {
    const { container } = render(<FormError id="err" message={message} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the message with the given id", () => {
    render(<FormError id="err" message="Invalid email or password" />);

    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent("Invalid email or password");
    expect(alert).toHaveAttribute("id", "err");
  });

  it("updates the text when the message changes", () => {
    const { rerender } = render(<FormError id="err" message="First" />);

    rerender(<FormError id="err" message="Second" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Second");
  });

  it("disappears when the message is cleared", () => {
    const { rerender } = render(<FormError id="err" message="Boom" />);

    rerender(<FormError id="err" />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  describe("accessibility", () => {
    it("is announced as an alert", () => {
      render(<FormError id="err" message="Boom" />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("moves focus to itself when it appears", () => {
      const { rerender } = render(<FormError id="err" />);

      rerender(<FormError id="err" message="Boom" />);

      expect(screen.getByRole("alert")).toHaveFocus();
    });

    it("moves focus again when the message changes", () => {
      const { rerender } = render(
        <>
          <input aria-label="Other" />
          <FormError id="err" message="First" />
        </>,
      );
      screen.getByLabelText("Other").focus();

      rerender(
        <>
          <input aria-label="Other" />
          <FormError id="err" message="Second" />
        </>,
      );

      expect(screen.getByRole("alert")).toHaveFocus();
    });

    it("is focusable by script but not in the tab order", async () => {
      render(
        <>
          <button>Before</button>
          <FormError id="err" message="Boom" />
          <button>After</button>
        </>,
      );
      screen.getByRole("button", { name: "Before" }).focus();

      await userEvent.tab();

      expect(screen.getByRole("alert")).toHaveAttribute("tabindex", "-1");
      expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
    });

    it("can describe an input by its id", () => {
      render(
        <>
          <input aria-label="Email" aria-describedby="err" aria-invalid />
          <FormError id="err" message="Enter a valid email" />
        </>,
      );

      expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
        "Enter a valid email",
      );
    });

    it("has no axe violations", async () => {
      const { container } = render(<FormError id="err" message="Boom" />);

      await expectNoA11yViolations(container);
    });
  });
});
