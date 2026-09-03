"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Boxes, Plus, Search as SearchIcon, Trash2, X } from "lucide-react";
import type {
  AssetSourceType,
  AssetType,
  LicenseType,
} from "@/lib/types";
import { api } from "@/lib/api";
import { useDebouncedValue, useQuery, useQueryParams } from "@/lib/hooks";
import { ASSET_TYPE_LABELS, LICENSE_LABELS } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { ButtonLink } from "@/components/ui/button";
import { FilterMenu } from "@/components/ui/filter-menu";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AssetResults,
  AssetView,
  AssetViewToggle,
} from "@/components/assets/asset-results";

const TYPE_OPTIONS = (Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((v) => ({
  value: v,
  label: ASSET_TYPE_LABELS[v],
}));
const SOURCE_OPTIONS: { value: AssetSourceType; label: string }[] = [
  { value: "upload", label: "Uploaded" },
  { value: "url", label: "From URL" },
  { value: "marketplace_link", label: "Marketplace" },
  { value: "extension", label: "Web clip" },
];
const LICENSE_OPTIONS = (Object.keys(LICENSE_LABELS) as LicenseType[]).map((v) => ({
  value: v,
  label: LICENSE_LABELS[v],
}));

const SORTS = [
  { value: "createdAt", label: "Date added" },
  { value: "updatedAt", label: "Last updated" },
  { value: "title", label: "Title" },
  { value: "fileSizeMB", label: "File size" },
  { value: "type", label: "Type" },
];

function csv(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function AssetsBrowser() {
  const { get, set, searchParams } = useQueryParams();

  const deleted = get("deleted") === "1";
  const view = (get("view") as AssetView) || "grid";
  const page = Number(get("page") || "1");
  const sortBy = get("sortBy") || "createdAt";
  const sortOrder = (get("sortOrder") as "asc" | "desc") || "desc";

  const types = csv(get("type"));
  const sources = csv(get("sourceType"));
  const licenses = csv(get("licenseType"));
  const tags = csv(get("tags"));
  const projectId = get("projectId") || "";

  const [term, setTerm] = useState(get("q") ?? "");
  const debouncedTerm = useDebouncedValue(term, 350);

  useEffect(() => {
    if ((get("q") ?? "") !== debouncedTerm) {
      set({ q: debouncedTerm || null, page: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm]);

  const { data: filterData } = useQuery(
    () =>
      Promise.all([
        api.tags.list({ limit: 100, sortBy: "usageCount", sortOrder: "desc" }),
        api.projects.list({ limit: 100, sortBy: "name", sortOrder: "asc" }),
      ]),
    [],
  );

  const key = searchParams.toString();
  const { data, loading, error, refetch } = useQuery(
    () =>
      api.assets.list({
        page,
        limit: 24,
        sortBy: sortBy as "createdAt",
        sortOrder,
        q: get("q") || undefined,
        type: types.length ? (types as AssetType[]) : undefined,
        sourceType: sources.length ? (sources as AssetSourceType[]) : undefined,
        licenseType: licenses.length ? (licenses as LicenseType[]) : undefined,
        tags: tags.length ? tags : undefined,
        projectId: projectId || undefined,
        deleted: deleted || undefined,
      }),
    [key],
  );

  const activeFilters =
    types.length + sources.length + licenses.length + tags.length + (projectId ? 1 : 0);

  const projectOptions = useMemo(
    () => filterData?.[1].data.map((p) => ({ value: p.id, label: p.name })) ?? [],
    [filterData],
  );
  const tagOptions = useMemo(
    () => filterData?.[0].data.map((t) => ({ value: t.slug, label: t.name })) ?? [],
    [filterData],
  );

  return (
    <div>
      <PageHeader
        title={deleted ? "Trash" : "Assets"}
        description={
          deleted
            ? "Soft-deleted assets. Restore anything within reach — files are kept."
            : "Everything you've collected. Filter down, then open one for the full picture."
        }
        actions={
          deleted ? (
            <ButtonLink href="/assets" variant="secondary">
              Back to assets
            </ButtonLink>
          ) : (
            <ButtonLink href="/assets/new">
              <Plus className="size-4" />
              Add asset
            </ButtonLink>
          )
        }
      />

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Filter by title, description…"
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:outline-1 focus-visible:outline-primary"
          />
        </div>

        <FilterMenu
          label="Type"
          options={TYPE_OPTIONS}
          selected={types}
          onChange={(v) => set({ type: v.join(",") || null, page: null })}
        />
        <FilterMenu
          label="Source"
          options={SOURCE_OPTIONS}
          selected={sources}
          onChange={(v) => set({ sourceType: v.join(",") || null, page: null })}
        />
        <FilterMenu
          label="License"
          options={LICENSE_OPTIONS}
          selected={licenses}
          onChange={(v) => set({ licenseType: v.join(",") || null, page: null })}
        />
        <FilterMenu
          label="Project"
          options={projectOptions}
          selected={projectId ? [projectId] : []}
          single
          onChange={(v) => set({ projectId: v[0] || null, page: null })}
        />
        <FilterMenu
          label="Tags"
          options={tagOptions}
          selected={tags}
          onChange={(v) => set({ tags: v.join(",") || null, page: null })}
        />

        {activeFilters > 0 && (
          <button
            type="button"
            onClick={() =>
              set({
                type: null,
                sourceType: null,
                licenseType: null,
                tags: null,
                projectId: null,
                page: null,
              })
            }
            className="flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-2"
          >
            <X className="size-3.5" />
            Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split(":");
              set({ sortBy: sb, sortOrder: so, page: null });
            }}
            className="h-9 w-auto"
          >
            {SORTS.map((s) => (
              <optgroup key={s.value} label={s.label}>
                <option value={`${s.value}:desc`}>{s.label} — desc</option>
                <option value={`${s.value}:asc`}>{s.label} — asc</option>
              </optgroup>
            ))}
          </Select>
          <AssetViewToggle
            view={view}
            onChange={(v) => set({ view: v === "grid" ? null : v })}
          />
        </div>
      </div>

      {!deleted && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => set({ deleted: 1, page: null })}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3.5" />
            View trash
          </button>
        </div>
      )}

      <AssetResults
        assets={data?.data}
        meta={data?.meta}
        loading={loading}
        error={error}
        view={view}
        onPageChange={(p) => set({ page: p === 1 ? null : p })}
        onRetry={refetch}
        empty={
          <EmptyState
            icon={activeFilters || get("q") ? SearchIcon : deleted ? Trash2 : Boxes}
            title={
              activeFilters || get("q")
                ? "No assets match those filters"
                : deleted
                  ? "Trash is empty"
                  : "No assets yet"
            }
            description={
              activeFilters || get("q")
                ? "Try loosening a filter or clearing the search."
                : deleted
                  ? "Deleted assets show up here and can be restored."
                  : "Upload a file or import a link to start your vault."
            }
            action={
              !deleted && !activeFilters && !get("q") ? (
                <ButtonLink href="/assets/new">Add your first asset</ButtonLink>
              ) : undefined
            }
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
