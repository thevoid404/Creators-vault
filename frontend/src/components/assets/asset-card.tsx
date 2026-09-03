"use client";

import Link from "next/link";
import type { Route } from "next";
import { motion } from "motion/react";
import { ArrowUpRight, FolderKanban, Link2, ShoppingBag, Upload, Puzzle } from "lucide-react";
import type { Asset } from "@/lib/types";
import { ASSET_TYPE_LABELS } from "@/lib/utils";
import { AssetPreview } from "./asset-preview";
import { Badge } from "@/components/ui/badge";

const SOURCE_META: Record<
  Asset["sourceType"],
  { label: string; icon: typeof Upload }
> = {
  upload: { label: "Uploaded", icon: Upload },
  url: { label: "From URL", icon: Link2 },
  marketplace_link: { label: "Marketplace", icon: ShoppingBag },
  extension: { label: "Web clip", icon: Puzzle },
};

interface AssetCardProps {
  asset: Asset;
  /** optional similarity score label, shown as a corner badge */
  scoreLabel?: string;
}

export function AssetCard({ asset, scoreLabel }: AssetCardProps) {
  const source = SOURCE_META[asset.sourceType];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="group relative"
    >
      <Link
        href={`/assets/${asset.id}` as Route}
        className="block overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border-strong"
      >
        <div className="relative aspect-[16/10] w-full">
          <AssetPreview
            asset={asset}
            rounded="rounded-none"
            className="size-full"
          />
          {scoreLabel && (
            <span className="absolute left-2 top-2 rounded-md bg-primary/90 px-1.5 py-0.5 text-xs font-semibold text-primary-foreground backdrop-blur">
              {scoreLabel}
            </span>
          )}
          <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg bg-surface/80 text-subtle-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
            <ArrowUpRight className="size-4" />
          </span>
        </div>

        <div className="p-3.5">
          <p className="line-clamp-1 text-sm font-semibold text-foreground" title={asset.title}>
            {asset.title}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge tone="neutral">{ASSET_TYPE_LABELS[asset.type]}</Badge>
            <span className="inline-flex items-center gap-1">
              <source.icon className="size-3" />
              {source.label}
            </span>
          </div>

          {asset.project ? (
            <div className="mt-2.5 flex items-center gap-1.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
              <FolderKanban className="size-3.5 shrink-0 text-subtle-foreground" />
              <span className="truncate">
                In <span className="font-medium text-foreground">{asset.project.name}</span>
                {asset.section && (
                  <span className="text-subtle-foreground"> · {asset.section}</span>
                )}
              </span>
            </div>
          ) : (
            <div className="mt-2.5 border-t border-border pt-2.5 text-xs text-subtle-foreground">
              Not in a project yet
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export function AssetCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="aspect-[16/10] w-full animate-pulse bg-surface-3" />
      <div className="space-y-2 p-3.5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-3" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-3" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-3" />
      </div>
    </div>
  );
}

export function AssetCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}
