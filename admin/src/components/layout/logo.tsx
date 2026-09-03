import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground",
        className,
      )}
      aria-hidden="true"
    >
      CV
    </span>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <Logo />
      <span className="flex flex-col leading-none">
        <span className="text-sm font-bold text-foreground">Creators&apos; Vault</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Admin
        </span>
      </span>
    </span>
  );
}
