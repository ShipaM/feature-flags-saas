import type { ComponentProps, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inputClass } from "../constants";

type IconFieldProps = Omit<ComponentProps<typeof Input>, "id" | "name"> & {
  name: string;
  label: string;
  icon: LucideIcon;
  children?: ReactNode;
};

export const IconField = ({
  name,
  label,
  icon: Icon,
  className,
  children,
  ...inputProps
}: IconFieldProps) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={name}>{label}</Label>
    <div className="relative">
      <Icon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={name}
        name={name}
        required
        className={className ? `${inputClass} ${className}` : inputClass}
        {...inputProps}
      />
      {children}
    </div>
  </div>
);
