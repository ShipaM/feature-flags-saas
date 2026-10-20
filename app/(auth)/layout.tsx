import { ModeToggle } from "@/components/ui/mode-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex min-h-svh flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-[#07060f]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 size-[36rem] rounded-full bg-violet-400/50 blur-3xl motion-safe:animate-aurora dark:bg-violet-600/40" />
        <div className="absolute top-1/4 -right-40 size-[32rem] rounded-full bg-sky-300/50 blur-3xl [animation-delay:-6s] motion-safe:animate-aurora dark:bg-blue-600/35" />
        <div className="absolute -bottom-48 left-1/4 size-[34rem] rounded-full bg-fuchsia-300/40 blur-3xl [animation-delay:-12s] motion-safe:animate-aurora dark:bg-fuchsia-600/30" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(0_0_0/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(0_0_0/0.04)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_center,black_30%,transparent_75%)] bg-size-[48px_48px] dark:bg-[linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)]" />
      </div>

      <header className="absolute top-0 right-0 p-4">
        <ModeToggle />
      </header>
      {children}
    </div>
  );
}
