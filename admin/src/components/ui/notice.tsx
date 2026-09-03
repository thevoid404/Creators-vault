import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Honest labelling for backend stub data. The admin panel never presents
 * marketplace / payment figures as if they were real.
 */
export function StubNotice({
  children,
  tone = "warning",
  className,
}: {
  children: React.ReactNode;
  tone?: "warning" | "info";
  className?: string;
}) {
  const Icon = tone === "warning" ? TriangleAlert : Info;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm",
        tone === "warning"
          ? "border-warning-soft bg-warning-soft/50 text-warning-soft-foreground"
          : "border-info-soft bg-info-soft/50 text-info-soft-foreground",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
