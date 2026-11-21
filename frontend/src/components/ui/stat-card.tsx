import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  trend?: string;
  tone?: "primary" | "success" | "warning" | "info";
  loading?: boolean;
}

const TONE_STYLES: Record<
  NonNullable<StatCardProps["tone"]>,
  { stroke: string; iconBg: string; text: string }
> = {
  primary: {
    stroke: "#6d64ff",
    iconBg: "bg-[#6d64ff]/15 text-[#818cf8] border-[#6d64ff]/25",
    text: "text-[#818cf8]",
  },
  success: {
    stroke: "#22c55e",
    iconBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    text: "text-emerald-400",
  },
  info: {
    stroke: "#06b6d4",
    iconBg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    text: "text-cyan-400",
  },
  warning: {
    stroke: "#f59e0b",
    iconBg: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    text: "text-amber-400",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  tone = "primary",
  loading,
}: StatCardProps) {
  const style = TONE_STYLES[tone];

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-xl dark:bg-[#101522]">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-xl border backdrop-blur-md",
            style.iconBg,
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>

      {/* Main Metric Value */}
      <div className="mt-3">
        {loading ? (
          <div className="h-9 w-20 animate-pulse rounded-xl bg-surface-3" />
        ) : (
          <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        )}
      </div>

      {/* Bottom section: Trend percentage + sparkline curve matching mockup */}
      <div className="mt-4 flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {trend ? (
            <span className={cn("flex items-center gap-0.5", style.text)}>
              {trend}
            </span>
          ) : (
            <span className="text-xs text-subtle-foreground">{hint ?? "—"}</span>
          )}
        </div>

        {/* Crisp vector sparkline curve (Exact graphic from mockup) */}
        <div className="h-6 w-20 opacity-80 transition-opacity hover:opacity-100">
          <svg viewBox="0 0 80 24" className="size-full overflow-visible" fill="none">
            <path
              d="M2 18 C 15 17, 22 22, 34 14 C 44 8, 56 16, 66 6 C 72 2, 76 5, 78 4"
              stroke={style.stroke}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
