import { cn } from "@/lib/utils";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted-foreground border-border",
  primary: "bg-primary-soft text-primary-soft-foreground border-transparent",
  success: "bg-success-soft text-success-soft-foreground border-transparent",
  warning: "bg-warning-soft text-warning-soft-foreground border-transparent",
  danger: "bg-danger-soft text-danger-soft-foreground border-transparent",
  info: "bg-info-soft text-info-soft-foreground border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
      {...rest}
    />
  );
}

export function Dot({ tone = "neutral" }: { tone?: BadgeTone }) {
  const color: Record<BadgeTone, string> = {
    neutral: "bg-subtle-foreground",
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
  };
  return <span className={cn("size-1.5 shrink-0 rounded-full", color[tone])} />;
}
