import { cn } from "@/lib/utils";

/** Creators' Vault mark — a stylised vault door / layered "V". */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" fill="var(--color-primary)" />
      <path
        d="M9 9.5 16 22l7-12.5"
        stroke="var(--color-primary-foreground)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="16"
        cy="13.5"
        r="2.4"
        stroke="var(--color-primary-foreground)"
        strokeWidth="2.2"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo className="size-7" />
      <span className="text-[15px] font-bold tracking-tight text-foreground">
        Creators&apos; Vault
      </span>
    </span>
  );
}
