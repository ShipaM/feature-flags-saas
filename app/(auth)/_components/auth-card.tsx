import { useId, type ComponentProps, type ReactNode } from "react";
import { ToggleRight } from "lucide-react";

type AuthCardProps = {
  title: string;
  description: string;
  footer: ReactNode;
  action: ComponentProps<"form">["action"];
  pending: boolean;
  children: ReactNode;
};

export const AuthCard = ({
  title,
  description,
  footer,
  action,
  pending,
  children,
}: AuthCardProps) => {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div className="relative w-full max-w-sm motion-safe:animate-fade-up">
      <div
        aria-hidden
        className="absolute -inset-px -z-10 rounded-3xl bg-linear-to-br from-violet-500/40 via-transparent to-sky-500/40 blur-xl"
      />

      <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-2xl shadow-violet-500/10 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 dark:shadow-black/40">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-sky-500 text-white shadow-lg shadow-violet-500/30">
            <ToggleRight aria-hidden className="size-6" />
          </div>
          <h1
            id={titleId}
            className="font-heading text-2xl font-semibold tracking-tight"
          >
            {title}
          </h1>
          <p
            id={descriptionId}
            className="mt-1.5 text-sm text-muted-foreground"
          >
            {description}
          </p>
        </div>

        <form
          action={action}
          noValidate
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          aria-busy={pending}
          className="flex flex-col gap-5"
        >
          {children}
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {footer}
        </p>
      </div>
    </div>
  );
};
