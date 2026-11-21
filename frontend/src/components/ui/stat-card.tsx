import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "info";
  loading?: boolean;
}

const TONE_STYLES: Record<
  NonNullable<StatCardProps["tone"]>,
  { badge: string; glow: string }
> = {
  primary: {
    badge: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30",
    glow: "from-indigo-500/10 to-transparent",
  },
  success: {
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
    glow: "from-emerald-500/10 to-transparent",
  },
  warning: {
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
    glow: "from-amber-500/10 to-transparent",
  },
  info: {
    badge: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400 dark:border-sky-500/30",
    glow: "from-sky-500/10 to-transparent",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
  loading,
}: StatCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-surface/80 p-5 shadow-lg backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-[#141620]/90">
      {/* Top subtle ambient glow */}
      <div
        className={cn(
          "pointer-events-none absolute -top-10 -right-10 size-24 rounded-full bg-gradient-to-br blur-2xl",
          styles.glow,
        )}
      />

      <div className="relative z-10 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-2xl border backdrop-blur-md",
            styles.badge,
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>

      <div className="relative z-10 mt-3">
        {loading ? (
          <div className="h-8 w-20 animate-pulse rounded-xl bg-surface-3" />
        ) : (
          <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        )}
        {hint && !loading && (
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
}
