"use client";

import Link from "next/link";
import type { Route } from "next";
import type { Asset } from "@/lib/types";
import { ASSET_TYPE_LABELS, cn, formatRelativeTime } from "@/lib/utils";
import { AssetPreview } from "./asset-preview";

interface AssetRowProps {
  asset: Asset;
  /** what to show on the right: relative time of this field */
  timeField?: "createdAt" | "updatedAt";
  note?: string;
  className?: string;
}

export function AssetRow({ asset, timeField = "createdAt", note, className }: AssetRowProps) {
  return (
    <Link
      href={`/assets/${asset.id}` as Route}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2",
        className,
      )}
    >
      <AssetPreview asset={asset} className="size-10 shrink-0" rounded="rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium text-foreground">{asset.title}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {ASSET_TYPE_LABELS[asset.type]}
          {asset.project && ` · ${asset.project.name}`}
          {note && ` · ${note}`}
        </p>
      </div>
      <span className="shrink-0 text-xs text-subtle-foreground">
        {formatRelativeTime(asset[timeField])}
      </span>
    </Link>
  );
}
