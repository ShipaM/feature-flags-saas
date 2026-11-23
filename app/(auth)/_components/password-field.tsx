"use client";
import { useState, type ComponentProps } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { IconField } from "./icon-field";

type PasswordFieldProps = Omit<
  ComponentProps<typeof IconField>,
  "name" | "label" | "icon" | "type" | "children"
>;

export const PasswordField = (props: PasswordFieldProps) => {
  const [visible, setVisible] = useState(false);
  const Toggle = visible ? EyeOff : Eye;

  return (
    <IconField
      name="password"
      label="Password"
      icon={Lock}
      type={visible ? "text" : "password"}
      className="pr-10"
      {...props}
    >
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls="password"
        className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
      >
        <Toggle aria-hidden className="size-4" />
      </button>
    </IconField>
  );
};
