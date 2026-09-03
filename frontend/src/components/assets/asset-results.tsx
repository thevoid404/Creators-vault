"use client";

import { LayoutGrid, List } from "lucide-react";
import type { Asset, PageMeta } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AssetCard, AssetCardGrid, AssetCardSkeleton } from "./asset-card";
import { AssetRow } from "./asset-row";
import { Pagination } from "@/components/ui/pagination";
import { ErrorState } from "@/components/ui/empty-state";

export type AssetView = "grid" | "list";

interface AssetResultsProps {
  assets: Asset[] | undefined;
  meta: PageMeta | undefined;
  loading: boolean;
  error?: Error | null;
  view: AssetView;
  onViewChange?: (view: AssetView) => void;
  onPageChange: (page: number) => void;
  onRetry?: () => void;
  empty: React.ReactNode;
  /** map of assetId → score label (semantic / similar results) */
  scores?: Record<string, string>;
}

export function AssetViewToggle({
  view,
  onChange,
}: {
  view: AssetView;
  onChange: (v: AssetView) => void;
}) {
  return (
    <div className="flex rounded-lg border border-border bg-surface p-0.5">
      {(["grid", "list"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          aria-label={`${v} view`}
          className={cn(
            "flex size-8 items-center justify-center rounded-md transition-colors",
            view === v
              ? "bg-surface-2 text-foreground"
              : "text-subtle-foreground hover:text-foreground",
          )}
        >
          {v === "grid" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
        </button>
      ))}
    </div>
  );
}

export function AssetResults({
  assets,
  meta,
  loading,
  error,
  view,
  onPageChange,
  onRetry,
  empty,
  scores,
}: AssetResultsProps) {
  if (error) {
    return (
      <ErrorState
        description={error.message}
        onRetry={onRetry}
      />
    );
  }

  if (loading && !assets) {
    return view === "grid" ? (
      <AssetCardGrid>
        {Array.from({ length: 8 }).map((_, i) => (
          <AssetCardSkeleton key={i} />
        ))}
      </AssetCardGrid>
    ) : (
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-2">
            <div className="size-10 animate-pulse rounded-md bg-surface-3" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-3" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-surface-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (assets && assets.length === 0) {
    return <>{empty}</>;
  }

  return (
    <div className={cn("space-y-5", loading && "opacity-60 transition-opacity")}>
      {view === "grid" ? (
        <AssetCardGrid>
          {assets?.map((a) => (
            <AssetCard key={a.id} asset={a} scoreLabel={scores?.[a.id]} />
          ))}
        </AssetCardGrid>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {assets?.map((a) => (
            <AssetRow key={a.id} asset={a} timeField="updatedAt" className="rounded-none px-4" />
          ))}
        </div>
      )}
      <Pagination meta={meta} onPageChange={onPageChange} />
    </div>
  );
}
