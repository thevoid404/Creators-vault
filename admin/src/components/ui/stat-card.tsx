import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "info" | "danger";
  loading?: boolean;
}

const TONE_BG: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "primary",
  loading,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          className={cn("flex size-8 items-center justify-center rounded-lg", TONE_BG[tone])}
        >
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? (
        <div className="mt-3 h-7 w-16 animate-pulse rounded bg-surface-3" />
      ) : (
        <p className="nums mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      )}
      {hint && !loading && <p className="mt-1 text-xs text-subtle-foreground">{hint}</p>}
    </div>
  );
}
