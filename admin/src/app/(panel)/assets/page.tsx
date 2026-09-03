"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Boxes, EyeOff, X } from "lucide-react";
import { api } from "@/lib/api";
import type {
  AdminListAssetsQuery,
  Asset,
  AssetSourceType,
  AssetType,
  SortOrder,
} from "@/lib/types";
import { useDebouncedValue, useQuery, useQueryParams } from "@/lib/hooks";
import {
  ASSET_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  formatDate,
  formatSizeMB,
} from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput, Select } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { IdChip } from "@/components/shared";

const PAGE_SIZE = 25;

function AssetsBrowser() {
  const router = useRouter();
  const { get, set } = useQueryParams();

  const page = Number(get("page") || "1");
  const sortBy = (get("sortBy") as AdminListAssetsQuery["sortBy"]) || "createdAt";
  const sortOrder = (get("sortOrder") as SortOrder) || "desc";
  const type = get("type") || "";
  const sourceType = get("sourceType") || "";
  const ownerId = get("ownerId") || "";
  const deleted = get("deleted") === "1";

  const [term, setTerm] = useState(get("q") ?? "");
  const debounced = useDebouncedValue(term, 350);
  useEffect(() => {
    if ((get("q") ?? "") !== debounced) set({ q: debounced || null, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const { data, loading, error, refetch } = useQuery(
    () =>
      api.admin.assets({
        page,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder,
        q: get("q") || undefined,
        type: type ? [type as AssetType] : undefined,
        sourceType: sourceType ? [sourceType as AssetSourceType] : undefined,
        ownerId: ownerId || undefined,
        deleted: deleted || undefined,
      }),
    [page, sortBy, sortOrder, type, sourceType, ownerId, deleted, get("q")],
  );

  const toggleSort = (key: string) =>
    set({
      sortBy: key,
      sortOrder: sortBy === key && sortOrder === "desc" ? "asc" : "desc",
      page: null,
    });

  const columns: Column<Asset>[] = [
    {
      key: "asset",
      header: "Asset",
      sortKey: "title",
      cell: (a) => (
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-2">
            {a.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.previewUrl} alt="" className="size-full object-cover" />
            ) : (
              <Boxes className="size-4 text-subtle-foreground" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{a.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {a.category ?? "no category"}
            </p>
          </div>
        </div>
      ),
    },
    { key: "type", header: "Type", cell: (a) => <Badge tone="neutral">{ASSET_TYPE_LABELS[a.type]}</Badge> },
    { key: "source", header: "Source", cell: (a) => <span className="text-muted-foreground">{SOURCE_TYPE_LABELS[a.sourceType]}</span> },
    { key: "owner", header: "Owner", cell: (a) => <IdChip id={a.ownerId} /> },
    {
      key: "size",
      header: "Size",
      sortKey: "fileSizeMB",
      align: "right",
      cell: (a) => <span className="nums">{formatSizeMB(a.fileSizeMB)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (a) =>
        a.deletedAt ? <Badge tone="danger">Hidden</Badge> : <Badge tone="success">Live</Badge>,
    },
    {
      key: "created",
      header: "Added",
      sortKey: "createdAt",
      align: "right",
      cell: (a) => <span className="nums text-muted-foreground">{formatDate(a.createdAt)}</span>,
    },
  ];

  const hasFilters = Boolean(type || sourceType || ownerId || get("q"));

  return (
    <div>
      <PageHeader
        title={deleted ? "Hidden assets" : "Assets"}
        description={
          deleted
            ? "Assets hidden by moderation. Open one to restore it."
            : "Every asset across the platform. Open a row to inspect or moderate."
        }
        actions={
          <button
            type="button"
            onClick={() => set({ deleted: deleted ? null : 1, page: null })}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-2"
          >
            <EyeOff className="size-4" />
            {deleted ? "Show live" : "Show hidden"}
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search title, description, category…"
          className="min-w-[14rem] flex-1 sm:max-w-xs"
        />
        <Select value={type} onChange={(e) => set({ type: e.target.value || null, page: null })} className="w-auto" aria-label="Filter by type">
          <option value="">All types</option>
          {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((t) => (
            <option key={t} value={t}>
              {ASSET_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select value={sourceType} onChange={(e) => set({ sourceType: e.target.value || null, page: null })} className="w-auto" aria-label="Filter by source">
          <option value="">All sources</option>
          {(Object.keys(SOURCE_TYPE_LABELS) as AssetSourceType[]).map((s) => (
            <option key={s} value={s}>
              {SOURCE_TYPE_LABELS[s]}
            </option>
          ))}
        </Select>
        {ownerId && (
          <Badge tone="primary" className="h-9 gap-1.5 px-2.5">
            owner {ownerId.slice(0, 8)}
            <button
              type="button"
              onClick={() => set({ ownerId: null, page: null })}
              aria-label="Clear owner filter"
              className="cursor-pointer"
            >
              <X className="size-3" />
            </button>
          </Badge>
        )}
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              set({ type: null, sourceType: null, ownerId: null, q: null, page: null });
            }}
            className="flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-2"
          >
            <X className="size-3.5" />
            Clear
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={data?.data}
        getRowKey={(a) => a.id}
        meta={data?.meta}
        loading={loading}
        error={error}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={toggleSort}
        onPageChange={(p) => set({ page: p === 1 ? null : p })}
        onRowClick={(a) => router.push(`/assets/${a.id}` as Route)}
        onRetry={refetch}
        empty={
          <EmptyState
            icon={Boxes}
            title={hasFilters ? "No assets match those filters" : deleted ? "No hidden assets" : "No assets yet"}
            description={hasFilters ? "Try loosening a filter." : undefined}
          />
        }
      />
    </div>
  );
}

export default function AssetsPage() {
  return (
    <Suspense fallback={null}>
      <AssetsBrowser />
    </Suspense>
  );
}
