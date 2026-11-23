import { render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFieldError } from "./use-field-error";

describe("useFieldError", () => {
  it("marks fields as valid when there is no error", () => {
    const { result } = renderHook(() => useFieldError(undefined));

    expect(result.current.errorProps).toEqual({
      "aria-invalid": false,
      "aria-describedby": undefined,
    });
  });

  it("treats an empty string as no error", () => {
    const { result } = renderHook(() => useFieldError(""));

    expect(result.current.errorProps["aria-invalid"]).toBe(false);
    expect(result.current.errorProps["aria-describedby"]).toBeUndefined();
  });

  it("marks fields as invalid and points them at the error id", () => {
    const { result } = renderHook(() => useFieldError("Boom"));

    expect(result.current.errorProps).toEqual({
      "aria-invalid": true,
      "aria-describedby": result.current.errorId,
    });
  });

  it("keeps the same error id across re-renders", () => {
    const { result, rerender } = renderHook(
      ({ error }: { error?: string }) => useFieldError(error),
      { initialProps: { error: undefined as string | undefined } },
    );
    const firstId = result.current.errorId;

    rerender({ error: "Boom" });

    expect(result.current.errorId).toBe(firstId);
    expect(result.current.errorProps["aria-describedby"]).toBe(firstId);
  });

  it("gives every hook instance its own id", () => {
    const a = renderHook(() => useFieldError("x"));
    const b = renderHook(() => useFieldError("x"));

    expect(a.result.current.errorId).not.toBe(b.result.current.errorId);
  });

  describe("accessibility", () => {
    const Field = ({ error }: { error?: string }) => {
      const { errorId, errorProps } = useFieldError(error);
      return (
        <>
          <label htmlFor="f">Field</label>
          <input id="f" {...errorProps} />
          {error && <p id={errorId}>{error}</p>}
        </>
      );
    };

    it("exposes the error as the input's accessible description", () => {
      render(<Field error="Enter a value" />);
      const input = screen.getByLabelText("Field");

      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription("Enter a value");
    });

    it("leaves the input valid and undescribed without an error", () => {
      render(<Field />);
      const input = screen.getByLabelText("Field");

      expect(input).toHaveAttribute("aria-invalid", "false");
      expect(input).not.toHaveAttribute("aria-describedby");
    });
  });
});
