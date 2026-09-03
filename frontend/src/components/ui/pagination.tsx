"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PaginationProps {
  meta: PageMeta | undefined;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ meta, onPageChange, className }: PaginationProps) {
  if (!meta || meta.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = meta;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-between gap-3 sm:flex-row",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground tabular-nums">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!meta.hasPreviousPage}
          className="flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
          Prev
        </button>
        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!meta.hasNextPage}
          className="flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-40"
        >
          Next
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
