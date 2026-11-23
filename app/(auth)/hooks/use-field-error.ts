import { useId } from "react";

// Links inputs to the shared form error so screen readers announce it
export const useFieldError = (error?: string) => {
  const errorId = useId();
  const hasError = Boolean(error);

  return {
    errorId,
    errorProps: {
      "aria-invalid": hasError,
      "aria-describedby": hasError ? errorId : undefined,
    },
  };
};
