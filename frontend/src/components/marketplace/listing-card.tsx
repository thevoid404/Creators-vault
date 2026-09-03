"use client";

import Link from "next/link";
import type { Route } from "next";
import { motion } from "motion/react";
import { Package } from "lucide-react";
import type { Listing } from "@/lib/types";
import { formatCurrency, titleCase } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const STATUS_TONE: Record<Listing["status"], "success" | "neutral" | "warning" | "danger"> = {
  published: "success",
  draft: "neutral",
  unlisted: "neutral",
  sold_out: "warning",
  archived: "danger",
};

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Link
        href={`/marketplace/${listing.id}` as Route}
        className="block overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border-strong"
      >
        <div className="relative flex aspect-[16/9] items-center justify-center bg-surface-2">
          {listing.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <Package className="size-8 text-subtle-foreground" />
          )}
          <span className="absolute left-2 top-2">
            <Badge tone={STATUS_TONE[listing.status]}>{titleCase(listing.status)}</Badge>
          </span>
        </div>
        <div className="p-3.5">
          <p className="line-clamp-1 text-sm font-semibold text-foreground">
            {listing.title}
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            by {listing.seller.name} · {listing.itemCount}{" "}
            {listing.itemCount === 1 ? "item" : "items"}
          </p>
          <p className="mt-2 text-sm font-bold text-foreground">
            {formatCurrency(listing.price, listing.currency)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
