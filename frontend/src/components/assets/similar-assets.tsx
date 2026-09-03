"use client";

import Link from "next/link";
import type { Route } from "next";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { SimilarAssetsResult } from "@/lib/types";
import { useQuery } from "@/lib/hooks";
import { ASSET_TYPE_LABELS } from "@/lib/utils";
import { AssetPreview } from "./asset-preview";

export function SimilarAssets({ assetId }: { assetId: string }) {
  const { data, initialLoading } = useQuery<SimilarAssetsResult>(
    () => api.assets.similar(assetId, { limit: 6 }),
    [assetId],
  );

  if (initialLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="h-4 w-28 animate-pulse rounded bg-surface-3" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-surface-3" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="size-4 text-primary" />
        Similar assets
      </h3>

      {data.data.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {data.reason ?? "Nothing similar found yet."}
        </p>
      ) : (
        <div className="mt-3 space-y-1">
          {data.data.map(({ asset, scoreLabel }) => (
            <Link
              key={asset.id}
              href={`/assets/${asset.id}` as Route}
              className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-surface-2"
            >
              <AssetPreview asset={asset} className="size-8 shrink-0" rounded="rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-xs font-medium text-foreground">
                  {asset.title}
                </p>
                <p className="text-[11px] text-subtle-foreground">
                  {ASSET_TYPE_LABELS[asset.type]}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-primary">
                {scoreLabel}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
