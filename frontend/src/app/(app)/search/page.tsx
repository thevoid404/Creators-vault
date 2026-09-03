"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Info, Search as SearchIcon, Sparkles, Type } from "lucide-react";
import type { AssetType, ScoredAsset, SearchStatus } from "@/lib/types";
import { api } from "@/lib/api";
import { useQuery, useQueryParams } from "@/lib/hooks";
import { ASSET_TYPE_LABELS } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { FilterMenu } from "@/components/ui/filter-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetResults } from "@/components/assets/asset-results";

const EXAMPLES = [
  "dark dashboard mockup",
  "geometric sans-serif font",
  "onboarding illustration",
  "checkout flow reference",
];

function csv(v: string | null) {
  return v ? v.split(",").filter(Boolean) : [];
}

function SearchInner() {
  const { get, set, searchParams } = useQueryParams();
  const q = get("q") ?? "";
  const mode = (get("mode") as "keyword" | "semantic") ?? "keyword";
  const page = Number(get("page") || "1");
  const types = csv(get("type"));
  const minSim = Number(get("min") || "0.15");

  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);

  const { data: status } = useQuery<SearchStatus>(() => api.search.status(), []);
  const semanticAvailable = status?.available ?? false;

  useEffect(() => {
    if (mode === "semantic" && status && !semanticAvailable) {
      set({ mode: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    set({ q: term.trim() || null, page: null });
  }

  const key = searchParams.toString();

  const keyword = useQuery(
    () =>
      api.search.keyword({
        q,
        page,
        limit: 24,
        type: types.length ? (types as AssetType[]) : undefined,
      }),
    [key],
    { enabled: Boolean(q) && mode === "keyword" },
  );

  const semantic = useQuery(
    () =>
      api.search.semantic({
        q,
        limit: 30,
        minSimilarity: minSim,
        type: types.length ? (types as AssetType[]) : undefined,
      }),
    [key],
    { enabled: Boolean(q) && mode === "semantic" },
  );

  const semanticAssets = semantic.data?.data.map((s: ScoredAsset) => s.asset);
  const scoreMap = useMemo(() => {
    const m: Record<string, string> = {};
    semantic.data?.data.forEach((s: ScoredAsset) => {
      if (s.scoreLabel && s.scoreLabel !== "—") m[s.asset.id] = s.scoreLabel;
    });
    return m;
  }, [semantic.data]);

  const typeOptions = (Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((v) => ({
    value: v,
    label: ASSET_TYPE_LABELS[v],
  }));

  return (
    <div>
      <PageHeader
        title="Search"
        description="Find an asset by a word you know is there, or by what it feels like."
      />

      <form onSubmit={submit} className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-subtle-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search your vault…"
          autoFocus
          className="h-12 w-full rounded-xl border border-border bg-surface pl-12 pr-4 text-sm text-foreground shadow-sm placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:outline-1 focus-visible:outline-primary"
        />
      </form>

      {/* Mode + filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {semanticAvailable && (
          <div className="flex rounded-lg border border-border bg-surface p-0.5">
            <button
              type="button"
              onClick={() => set({ mode: null, page: null })}
              className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium ${
                mode === "keyword"
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Type className="size-3.5" />
              Keyword
            </button>
            <button
              type="button"
              onClick={() => set({ mode: "semantic", page: null })}
              className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium ${
                mode === "semantic"
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <Sparkles className="size-3.5" />
              By meaning
            </button>
          </div>
        )}

        <FilterMenu
          label="Type"
          options={typeOptions}
          selected={types}
          onChange={(v) => set({ type: v.join(",") || null, page: null })}
        />

        {mode === "semantic" && (
          <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground">
            Min. similarity
            <input
              type="range"
              min={0}
              max={0.9}
              step={0.05}
              value={minSim}
              onChange={(e) => set({ min: e.target.value, page: null })}
              className="accent-primary"
            />
            <span className="tabular-nums">{Math.round(minSim * 100)}%</span>
          </label>
        )}
      </div>

      <div className="mt-6">
        {!q ? (
          <EmptyState
            icon={SearchIcon}
            title="Search your vault"
            description="Type above, or try one of these:"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => set({ q: ex, page: null })}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            }
          />
        ) : mode === "semantic" ? (
          <>
            {semantic.data && semantic.data.strategy === "keyword" && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-info-soft bg-info-soft/40 px-3 py-2.5 text-xs text-info-soft-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Showing keyword matches — {semantic.data.fallbackReason ?? "semantic search is unavailable."}
                </span>
              </div>
            )}
            <AssetResults
              assets={semanticAssets}
              meta={undefined}
              loading={semantic.loading}
              error={semantic.error}
              view="grid"
              onPageChange={() => {}}
              onRetry={semantic.refetch}
              scores={scoreMap}
              empty={
                <EmptyState
                  icon={Sparkles}
                  title="Nothing close enough"
                  description="Lower the minimum similarity, or try different wording."
                />
              }
            />
          </>
        ) : (
          <AssetResults
            assets={keyword.data?.data}
            meta={keyword.data?.meta}
            loading={keyword.loading}
            error={keyword.error}
            view="grid"
            onPageChange={(p) => set({ page: p === 1 ? null : p })}
            onRetry={keyword.refetch}
            empty={
              <EmptyState
                icon={SearchIcon}
                title={`No matches for “${q}”`}
                description="Check the spelling, or search by meaning if that's available."
              />
            }
          />
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}
