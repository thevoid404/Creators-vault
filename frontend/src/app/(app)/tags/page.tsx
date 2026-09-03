"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Hash, Pencil, Plus, Search as SearchIcon, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Tag } from "@/lib/types";
import { useDebouncedValue, useQuery } from "@/lib/hooks";
import { colorFromString } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/field";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { LoadingRow } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { TagFormDialog } from "@/components/tags/tag-form-dialog";
import { useToast } from "@/providers/toast-provider";

function TagsInner() {
  const toast = useToast();
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term, 300);
  const [usedOnly, setUsedOnly] = useState(false);
  const [sort, setSort] = useState<"usageCount" | "name" | "createdAt">("usageCount");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTag, setEditTag] = useState<Tag | null>(null);
  const [deleteTag, setDeleteTag] = useState<Tag | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, loading, error, refetch } = useQuery(
    () =>
      api.tags.list({
        q: debounced || undefined,
        usedOnly: usedOnly || undefined,
        sortBy: sort,
        sortOrder: sort === "name" ? "asc" : "desc",
        page,
        limit: 40,
      }),
    [debounced, usedOnly, sort, page],
  );

  async function confirmDelete() {
    if (!deleteTag) return;
    setDeleting(true);
    try {
      const res = await api.tags.remove(deleteTag.id);
      toast.success(
        "Tag deleted",
        res.detachedAssets > 0
          ? `Detached from ${res.detachedAssets} asset${res.detachedAssets === 1 ? "" : "s"}.`
          : undefined,
      );
      setDeleteTag(null);
      refetch();
    } catch {
      toast.error("Couldn't delete that tag");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Tags"
        description="Your personal tagging vocabulary. Renaming a tag updates its filter slug everywhere."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New tag
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
          <input
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Filter tags…"
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:outline-1 focus-visible:outline-primary"
          />
        </div>
        <Checkbox checked={usedOnly} onChange={setUsedOnly} label="In use only" />
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="ml-auto h-9 w-auto"
        >
          <option value="usageCount">Most used</option>
          <option value="name">Name A–Z</option>
          <option value="createdAt">Newest</option>
        </Select>
      </div>

      {error ? (
        <ErrorState onRetry={refetch} description={error.message} />
      ) : loading && !data ? (
        <LoadingRow />
      ) : data && data.data.length === 0 ? (
        <EmptyState
          icon={Hash}
          title={term ? "No tags match" : "No tags yet"}
          description={
            term
              ? "Try a different search."
              : "Tags are created automatically when you tag an asset — or add one here."
          }
          action={!term ? <Button onClick={() => setCreateOpen(true)}>New tag</Button> : undefined}
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data?.data.map((tag) => (
              <div
                key={tag.id}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: tag.color || colorFromString(tag.slug) }}
                />
                <Link
                  href={`/assets?tags=${tag.slug}` as Route}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                    {tag.name}
                  </p>
                  <p className="text-xs text-subtle-foreground">
                    {tag.usageCount ?? 0} {tag.usageCount === 1 ? "asset" : "assets"}
                  </p>
                </Link>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setEditTag(tag)}
                    aria-label={`Edit ${tag.name}`}
                    className="rounded-md p-1.5 text-subtle-foreground hover:bg-surface-2 hover:text-foreground"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTag(tag)}
                    aria-label={`Delete ${tag.name}`}
                    className="rounded-md p-1.5 text-subtle-foreground hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination meta={data?.meta} onPageChange={setPage} />
        </div>
      )}

      <TagFormDialog open={createOpen} onClose={() => setCreateOpen(false)} onSaved={refetch} />
      {editTag && (
        <TagFormDialog
          tag={editTag}
          open
          onClose={() => setEditTag(null)}
          onSaved={refetch}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTag)}
        onClose={() => setDeleteTag(null)}
        onConfirm={confirmDelete}
        title={`Delete “${deleteTag?.name}”?`}
        description={
          deleteTag?.usageCount
            ? `This tag is on ${deleteTag.usageCount} asset${deleteTag.usageCount === 1 ? "" : "s"}. They won't be deleted — just untagged. This can't be undone.`
            : "This permanently removes the tag. No assets are affected."
        }
        confirmLabel="Delete tag"
        danger
        loading={deleting}
      />
    </div>
  );
}

export default function TagsPage() {
  return (
    <Suspense fallback={null}>
      <TagsInner />
    </Suspense>
  );
}
