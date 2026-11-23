import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "@/tests/axe";
import { PasswordField } from "./password-field";

// The input has no textbox role while type=password, so query by label
const getInput = () => screen.getByLabelText("Password");
const getToggle = () => screen.getByRole("button", { name: /password/i });

describe("PasswordField", () => {
  it("renders a required password input named 'password'", () => {
    render(<PasswordField />);
    const input = getInput();

    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("name", "password");
    expect(input).toHaveAttribute("id", "password");
    expect(input).toBeRequired();
  });

  it("passes input props through", () => {
    render(
      <PasswordField
        autoComplete="new-password"
        placeholder="At least 12 characters"
        minLength={12}
        maxLength={128}
      />,
    );
    const input = getInput();

    expect(input).toHaveAttribute("autocomplete", "new-password");
    expect(input).toHaveAttribute("placeholder", "At least 12 characters");
    expect(input).toHaveAttribute("minlength", "12");
    expect(input).toHaveAttribute("maxlength", "128");
  });

  it("toggles the password visibility", async () => {
    render(<PasswordField />);

    await userEvent.click(getToggle());
    expect(getInput()).toHaveAttribute("type", "text");

    await userEvent.click(getToggle());
    expect(getInput()).toHaveAttribute("type", "password");
  });

  it("keeps the typed value when toggling", async () => {
    render(<PasswordField />);

    await userEvent.type(getInput(), "secret-123");
    await userEvent.click(getToggle());

    expect(getInput()).toHaveValue("secret-123");
  });

  it("does not submit the form when toggling", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PasswordField />
      </form>,
    );

    await userEvent.click(getToggle());

    expect(onSubmit).not.toHaveBeenCalled();
  });

  describe("accessibility", () => {
    it("labels the input 'Password'", () => {
      render(<PasswordField />);

      expect(getInput()).toBeInstanceOf(HTMLInputElement);
    });

    it("describes the toggle state with label and aria-pressed", async () => {
      render(<PasswordField />);
      const toggle = screen.getByRole("button", { name: "Show password" });

      expect(toggle).toHaveAttribute("aria-pressed", "false");

      await userEvent.click(toggle);

      expect(
        screen.getByRole("button", { name: "Hide password", pressed: true }),
      ).toBeInTheDocument();
    });

    it("points aria-controls at the input", () => {
      render(<PasswordField />);

      expect(getToggle()).toHaveAttribute("aria-controls", getInput().id);
    });

    it("can be toggled from the keyboard", async () => {
      const user = userEvent.setup();
      render(<PasswordField />);

      await user.tab(); // input
      await user.tab(); // toggle
      expect(getToggle()).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(getInput()).toHaveAttribute("type", "text");

      await user.keyboard(" ");
      expect(getInput()).toHaveAttribute("type", "password");
    });

    it("hides the icons from assistive technology", async () => {
      const { container } = render(<PasswordField />);
      const check = () => {
        for (const svg of container.querySelectorAll("svg")) {
          expect(svg).toHaveAttribute("aria-hidden", "true");
        }
      };

      check();
      await userEvent.click(getToggle());
      check();
    });

    it("forwards the error state to the input", () => {
      render(
        <>
          <PasswordField aria-invalid aria-describedby="err" />
          <p id="err">Too short</p>
        </>,
      );

      expect(getInput()).toHaveAttribute("aria-invalid", "true");
      expect(getInput()).toHaveAccessibleDescription("Too short");
    });

    it("has no axe violations in both states", async () => {
      const { container } = render(<PasswordField />);

      await expectNoA11yViolations(container);

      await userEvent.click(getToggle());
      await expectNoA11yViolations(container);
    });
  });
});
