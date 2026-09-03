"use client";

import { Suspense, useState } from "react";
import { Store } from "lucide-react";
import type { ListingStatus } from "@/lib/types";
import { api } from "@/lib/api";
import { useDebouncedValue, useQuery, useQueryParams } from "@/lib/hooks";
import { PageHeader } from "@/components/layout/page-header";
import { Select } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { LoadingRow } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { ListingCard } from "@/components/marketplace/listing-card";
import { StubBanner } from "@/components/marketplace/stub-banner";

const STATUSES: ListingStatus[] = [
  "published",
  "draft",
  "unlisted",
  "sold_out",
  "archived",
];

function MarketplaceInner() {
  const { get, set, searchParams } = useQueryParams();
  const page = Number(get("page") || "1");
  const status = get("status") || "";
  const sort = get("sort") || "createdAt:desc";
  const [term, setTerm] = useState(get("q") ?? "");
  const debounced = useDebouncedValue(term, 300);

  const [sb, so] = sort.split(":");

  const key = searchParams.toString() + debounced;
  const { data, loading, error, refetch } = useQuery(
    () =>
      api.marketplace.listings({
        page,
        limit: 12,
        q: debounced || undefined,
        status: (status as ListingStatus) || undefined,
        sortBy: sb as "createdAt",
        sortOrder: so as "desc",
      }),
    [key],
  );

  return (
    <div>
      <PageHeader
        title="Marketplace"
        description="Browse asset packs from other creators."
      />
      <StubBanner />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            set({ page: null });
          }}
          placeholder="Search listings…"
          className="h-9 min-w-[12rem] flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:outline-1 focus-visible:outline-primary sm:max-w-xs"
        />
        <Select
          value={status}
          onChange={(e) => set({ status: e.target.value || null, page: null })}
          className="h-9 w-auto"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </Select>
        <Select
          value={sort}
          onChange={(e) => set({ sort: e.target.value, page: null })}
          className="ml-auto h-9 w-auto"
        >
          <option value="createdAt:desc">Newest</option>
          <option value="price:asc">Price low → high</option>
          <option value="price:desc">Price high → low</option>
          <option value="title:asc">Title A–Z</option>
        </Select>
      </div>

      {error ? (
        <ErrorState onRetry={refetch} description={error.message} />
      ) : loading && !data ? (
        <LoadingRow />
      ) : data && data.data.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No listings match"
          description="Try clearing the filters."
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.data.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
          <Pagination meta={data?.meta} onPageChange={(p) => set({ page: p === 1 ? null : p })} />
        </div>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceInner />
    </Suspense>
  );
}
