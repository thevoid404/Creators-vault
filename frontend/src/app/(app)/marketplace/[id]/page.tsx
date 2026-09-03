"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { useQuery } from "@/lib/hooks";
import { ASSET_TYPE_LABELS, titleCase } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/skeleton";
import { AssetTypeIcon } from "@/components/assets/asset-type-icon";
import { PurchasePanel } from "@/components/marketplace/purchase-panel";
import { StubBanner } from "@/components/marketplace/stub-banner";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: listing, initialLoading, error, refetch } = useQuery<Listing>(
    () => api.marketplace.listing(id),
    [id],
  );

  if (initialLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="mx-auto max-w-md py-16">
        <ErrorState
          title="Listing not found"
          description="Only the sample listings exist in this build."
          onRetry={refetch}
        />
        <div className="mt-4 text-center">
          <Link href={"/marketplace" as Route} className="text-sm font-medium text-primary hover:underline">
            Back to marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={"/marketplace" as Route}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Marketplace
      </Link>

      <div className="mt-4">
        <StubBanner />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
            {listing.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.coverUrl} alt="" className="max-h-80 w-full object-cover" />
            ) : (
              <div className="flex h-48 items-center justify-center text-subtle-foreground">
                No cover image
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{titleCase(listing.status)}</Badge>
              <span className="text-xs text-muted-foreground">
                Sold by {listing.seller.name}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {listing.title}
            </h1>
            {listing.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {listing.description}
              </p>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              What&apos;s included ({listing.itemCount})
            </h2>
            <div className="divide-y divide-border rounded-xl border border-border bg-surface">
              {listing.items.map((item) => (
                <div key={item.assetId} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-9 items-center justify-center rounded-md bg-surface-2 text-subtle-foreground">
                    <AssetTypeIcon type={item.type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ASSET_TYPE_LABELS[item.type]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <PurchasePanel listing={listing} />
        </div>
      </div>
    </div>
  );
}
