"use client";

import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import { api } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { useDebouncedValue } from "@/lib/hooks";
import { ASSET_TYPE_LABELS, cn } from "@/lib/utils";
import { AssetPreview } from "./asset-preview";

export function AssetPicker({
  excludeId,
  selectedId,
  onSelect,
}: {
  excludeId?: string;
  selectedId: string | null;
  onSelect: (asset: Asset) => void;
}) {
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term, 300);
  const [results, setResults] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.assets
      .list({ q: debounced || undefined, limit: 8, sortBy: "updatedAt" })
      .then((res) => {
        if (!cancelled) setResults(res.data.filter((a) => a.id !== excludeId));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced, excludeId]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search your assets…"
          autoFocus
          className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:outline-1 focus-visible:outline-primary"
        />
      </div>
      <div className="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
        {loading && results.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-subtle-foreground">Searching…</p>
        )}
        {!loading && results.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-subtle-foreground">
            No assets found
          </p>
        )}
        {results.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2",
              selectedId === a.id && "bg-primary-soft",
            )}
          >
            <AssetPreview asset={a} className="size-9 shrink-0" rounded="rounded-md" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-medium text-foreground">{a.title}</p>
              <p className="text-xs text-muted-foreground">{ASSET_TYPE_LABELS[a.type]}</p>
            </div>
            {selectedId === a.id && <Check className="size-4 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}
