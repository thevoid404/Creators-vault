"use client";

import { HardDrive } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatSizeMB } from "@/lib/utils";

export function StorageMeter() {
  const { user } = useAuth();
  if (!user) return null;

  const used = user.storageUsedMB;
  const quota = user.storageQuotaMB || 1;
  const pct = Math.min(100, Math.round((used / quota) * 100));
  const near = pct >= 85;

  return (
    <div className="rounded-lg border border-border bg-surface-2/60 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <HardDrive className="size-3.5" />
        Storage
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={near ? "h-full rounded-full bg-warning" : "h-full rounded-full bg-primary"}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-subtle-foreground tabular-nums">
        {formatSizeMB(used)} of {formatSizeMB(quota)}
      </p>
    </div>
  );
}
