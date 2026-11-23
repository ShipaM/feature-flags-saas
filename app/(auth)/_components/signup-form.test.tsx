import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoA11yViolations } from "@/tests/axe";
import { signupAction } from "@/app/(auth)/signup/action";
import { SignupForm } from "./signup-form";

// The real action talks to the DB, Redis and better-auth
vi.mock("@/app/(auth)/signup/action", () => ({ signupAction: vi.fn() }));
const action = vi.mocked(signupAction);

// React 19 entangles async actions globally: one that never settles
// would block the next tests, so it is released after each test
let release: (() => void) | undefined;
const pendingAction = () =>
  new Promise<Awaited<ReturnType<typeof signupAction>>>((resolve) => {
    release = () => resolve({});
  });

const organization = () =>
  screen.getByRole("textbox", { name: "Organization" });
const name = () => screen.getByRole("textbox", { name: "Your name" });
const email = () => screen.getByRole("textbox", { name: "Email" });
const password = () => screen.getByLabelText("Password");
const submit = () =>
  screen.getByRole("button", { name: "Create organization" });
const allInputs = () => [organization(), name(), email(), password()];

const values = {
  organizationName: "Acme Inc.",
  name: "Jane Doe",
  email: "jane@acme.com",
};

const fillAndSubmit = async () => {
  await userEvent.type(organization(), values.organizationName);
  await userEvent.type(name(), values.name);
  await userEvent.type(email(), values.email);
  await userEvent.type(password(), "a-very-long-password");
  await userEvent.click(submit());
};

describe("SignupForm", () => {
  beforeEach(() => {
    action.mockReset();
  });

  afterEach(async () => {
    await act(async () => release?.());
    release = undefined;
  });

  it("renders the heading, all fields, submit button and sign-in link", () => {
    render(<SignupForm />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Create your organization",
      }),
    ).toBeInTheDocument();
    for (const input of allInputs()) expect(input).toBeRequired();
    expect(submit()).toBeEnabled();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("applies the same length limits as the server schema", () => {
    render(<SignupForm />);

    expect(organization()).toHaveAttribute("maxlength", "255");
    expect(name()).toHaveAttribute("maxlength", "255");
    expect(password()).toHaveAttribute("minlength", "12");
    expect(password()).toHaveAttribute("maxlength", "128");
  });

  it("uses autocomplete hints for password managers", () => {
    render(<SignupForm />);

    expect(organization()).toHaveAttribute("autocomplete", "organization");
    expect(name()).toHaveAttribute("autocomplete", "name");
    expect(email()).toHaveAttribute("autocomplete", "email");
    expect(password()).toHaveAttribute("autocomplete", "new-password");
  });

  it("sends all fields to the action", async () => {
    action.mockResolvedValue({});

    render(<SignupForm />);

    await fillAndSubmit();

    expect(action).toHaveBeenCalledOnce();
    const formData = action.mock.calls[0][1];
    expect(Object.fromEntries(formData)).toEqual({
      ...values,
      password: "a-very-long-password",
    });
  });

  it("shows the error and restores the entered values (not the password)", async () => {
    action.mockResolvedValue({
      error: "This email is already registered",
      values,
    });

    render(<SignupForm />);

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This email is already registered",
    );
    expect(organization()).toHaveValue(values.organizationName);
    expect(name()).toHaveValue(values.name);
    expect(email()).toHaveValue(values.email);
    expect(password()).toHaveValue("");
  });

  it("shows the pending state while creating", async () => {
    action.mockReturnValue(pendingAction());

    render(<SignupForm />);

    await fillAndSubmit();

    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
  });

  describe("accessibility", () => {
    it("names and describes the form by its heading and subtitle", () => {
      render(<SignupForm />);

      expect(
        screen.getByRole("form", { name: "Create your organization" }),
      ).toHaveAccessibleDescription(
        "You will be the owner and can invite your team later",
      );
    });

    it("has no error state before submitting", () => {
      render(<SignupForm />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      for (const input of allInputs()) {
        expect(input).toHaveAttribute("aria-invalid", "false");
        expect(input).not.toHaveAttribute("aria-describedby");
      }
    });

    it("marks all fields invalid, links them to the error and focuses it", async () => {
      action.mockResolvedValue({ error: "Enter a valid email", values });

      render(<SignupForm />);

      await fillAndSubmit();

      const alert = await screen.findByRole("alert");

      expect(alert).toHaveFocus();
      for (const input of allInputs()) {
        expect(input).toHaveAttribute("aria-invalid", "true");
        expect(input).toHaveAccessibleDescription("Enter a valid email");
      }
    });

    it("marks the form busy while pending", async () => {
      action.mockReturnValue(pendingAction());

      render(<SignupForm />);

      await fillAndSubmit();

      expect(screen.getByRole("form")).toHaveAttribute("aria-busy", "true");
    });

    it("follows a logical tab order", async () => {
      const user = userEvent.setup();

      render(<SignupForm />);

      const expected = [
        organization(),
        name(),
        email(),
        password(),
        screen.getByRole("button", { name: "Show password" }),
        submit(),
        screen.getByRole("link"),
      ];
      for (const element of expected) {
        await user.tab();
        expect(element).toHaveFocus();
      }
    });

    it("has no axe violations initially", async () => {
      const { container } = render(<SignupForm />);

      await expectNoA11yViolations(container);
    });

    it("has no axe violations with an error", async () => {
      action.mockResolvedValue({ error: "Enter a valid email", values });

      const { container } = render(<SignupForm />);

      await fillAndSubmit();
      await screen.findByRole("alert");

      await expectNoA11yViolations(container);
    });
  });
});
