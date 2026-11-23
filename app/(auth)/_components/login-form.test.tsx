import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "@/tests/axe";
import { loginAction } from "@/app/(auth)/login/action";
import { LoginForm } from "./login-form";

// The real action talks to better-auth and the DB
vi.mock("@/app/(auth)/login/action", () => ({ loginAction: vi.fn() }));
const action = vi.mocked(loginAction);

// React 19 entangles async actions globally: one that never settles
// would block the next tests, so it is released after each test
let release: (() => void) | undefined;
const pendingAction = () =>
  new Promise<Awaited<ReturnType<typeof loginAction>>>((resolve) => {
    release = () => resolve({});
  });

const email = () => screen.getByRole("textbox", { name: "Email" });
const password = () => screen.getByLabelText("Password");
const submit = () => screen.getByRole("button", { name: "Sign in" });

const fillAndSubmit = async () => {
  await userEvent.type(email(), "me@acme.com");
  await userEvent.type(password(), "secret-123");
  await userEvent.click(submit());
};

describe("LoginForm", () => {
  beforeEach(() => {
    action.mockReset();
  });

  afterEach(async () => {
    await act(async () => release?.());
    release = undefined;
  });

  it("renders the heading, fields, submit button and sign-up link", () => {
    render(<LoginForm />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(email()).toHaveAttribute("type", "email");
    expect(password()).toHaveAttribute("type", "password");
    expect(submit()).toBeEnabled();
    expect(
      screen.getByRole("link", { name: "Create an organization" }),
    ).toHaveAttribute("href", "/signup");
  });

  it("uses autocomplete hints for password managers", () => {
    render(<LoginForm />);

    expect(email()).toHaveAttribute("autocomplete", "email");
    expect(password()).toHaveAttribute("autocomplete", "current-password");
  });

  it("sends the entered credentials to the action", async () => {
    action.mockResolvedValue({});
    render(<LoginForm />);

    await fillAndSubmit();

    expect(action).toHaveBeenCalledOnce();

    const formData = action.mock.calls[0][1];

    expect(formData.get("email")).toBe("me@acme.com");
    expect(formData.get("password")).toBe("secret-123");
  });

  it("shows the error and keeps the email after a failed sign-in", async () => {
    action.mockResolvedValue({
      error: "Invalid email or password",
      email: "me@acme.com",
    });

    render(<LoginForm />);

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password",
    );
    expect(email()).toHaveValue("me@acme.com");
  });

  it("shows the pending state while signing in", async () => {
    action.mockReturnValue(pendingAction());
    render(<LoginForm />);

    await fillAndSubmit();

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  });

  describe("accessibility", () => {
    it("names and describes the form by its heading and subtitle", () => {
      render(<LoginForm />);

      expect(
        screen.getByRole("form", { name: "Welcome back" }),
      ).toHaveAccessibleDescription("Sign in to manage your feature flags");
    });

    it("has no error state before submitting", () => {
      render(<LoginForm />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      for (const input of [email(), password()]) {
        expect(input).toHaveAttribute("aria-invalid", "false");
        expect(input).not.toHaveAttribute("aria-describedby");
      }
    });

    it("marks fields invalid, links them to the error and focuses it", async () => {
      action.mockResolvedValue({ error: "Invalid email or password" });

      render(<LoginForm />);

      await fillAndSubmit();

      const alert = await screen.findByRole("alert");

      expect(alert).toHaveFocus();
      for (const input of [email(), password()]) {
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAccessibleDescription("Invalid email or password");
      }
    });

    it("marks the form busy while pending", async () => {
      action.mockReturnValue(pendingAction());
      render(<LoginForm />);

      await fillAndSubmit();

      expect(screen.getByRole("form")).toHaveAttribute("aria-busy", "true");
    });

    it("follows a logical tab order", async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.tab();
      expect(email()).toHaveFocus();

      await user.tab();
      expect(password()).toHaveFocus();

      await user.tab();
      expect(
        screen.getByRole("button", { name: "Show password" }),
      ).toHaveFocus();

      await user.tab();
      expect(submit()).toHaveFocus();

      await user.tab();
      expect(screen.getByRole("link")).toHaveFocus();
    });

    it("can be submitted with the keyboard", async () => {
      action.mockResolvedValue({});
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(email(), "me@acme.com");
      await user.type(password(), "secret-123{Enter}");

      expect(action).toHaveBeenCalledOnce();
    });

    it("has no axe violations initially", async () => {
      const { container } = render(<LoginForm />);

      await expectNoA11yViolations(container);
    });

    it("has no axe violations with an error", async () => {
      action.mockResolvedValue({ error: "Invalid email or password" });
      const { container } = render(<LoginForm />);

      await fillAndSubmit();
      await screen.findByRole("alert");

      await expectNoA11yViolations(container);
    });
  });
});
