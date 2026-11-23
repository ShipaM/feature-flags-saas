import { render, screen } from "@testing-library/react";
import { Mail } from "lucide-react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "@/tests/axe";
import { inputClass } from "../constants";
import { IconField } from "./icon-field";

describe("IconField", () => {
  it("uses the name as both id and name of the input", () => {
    render(<IconField name="email" label="Email" icon={Mail} />);

    const input = screen.getByRole("textbox", { name: "Email" });

    expect(input).toHaveAttribute("id", "email");
    expect(input).toHaveAttribute("name", "email");
  });

  it("is required by default and can be made optional", () => {
    const { rerender } = render(
      <IconField name="email" label="Email" icon={Mail} />,
    );

    expect(screen.getByLabelText("Email")).toBeRequired();

    rerender(
      <IconField name="email" label="Email" icon={Mail} required={false} />,
    );
    expect(screen.getByLabelText("Email")).not.toBeRequired();
  });

  it("passes input props through", () => {
    render(
      <IconField
        name="email"
        label="Email"
        icon={Mail}
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        defaultValue="me@acme.com"
        maxLength={255}
      />,
    );

    const input = screen.getByLabelText("Email");

    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(input).toHaveAttribute("placeholder", "you@company.com");
    expect(input).toHaveAttribute("maxlength", "255");
    expect(input).toHaveValue("me@acme.com");
  });

  it("applies the shared input style and appends an extra class", () => {
    const { rerender } = render(<IconField name="a" label="A" icon={Mail} />);

    expect(screen.getByLabelText("A").className).toContain(inputClass);

    rerender(<IconField name="a" label="A" icon={Mail} className="pr-10" />);

    const className = screen.getByLabelText("A").className;

    expect(className).toContain(inputClass);
    expect(className).toContain("pr-10");
  });

  it("renders children next to the input", () => {
    render(
      <IconField name="a" label="A" icon={Mail}>
        <button type="button">Extra</button>
      </IconField>,
    );

    expect(screen.getByRole("button", { name: "Extra" })).toBeInTheDocument();
  });

  describe("accessibility", () => {
    it("associates the label with the input", () => {
      render(<IconField name="email" label="Email" icon={Mail} />);

      expect(screen.getByLabelText("Email")).toBeInstanceOf(HTMLInputElement);
    });

    it("hides the icon from assistive technology", () => {
      const { container } = render(
        <IconField name="email" label="Email" icon={Mail} />,
      );

      expect(container.querySelector("svg")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    });

    it("forwards aria-invalid and aria-describedby", () => {
      render(
        <>
          <IconField
            name="email"
            label="Email"
            icon={Mail}
            aria-invalid
            aria-describedby="err"
          />
          <p id="err">Enter a valid email</p>
        </>,
      );

      const input = screen.getByLabelText("Email");

      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription("Enter a valid email");
    });

    it("has no axe violations", async () => {
      const { container } = render(
        <IconField name="email" label="Email" icon={Mail} type="email" />,
      );

      await expectNoA11yViolations(container);
    });
  });
});
