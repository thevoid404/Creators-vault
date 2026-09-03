"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { PageMeta, SortOrder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ErrorState } from "./empty-state";
import { Pagination } from "./pagination";
import { TableSkeleton } from "./skeleton";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** When set, the header is a sort toggle for this backend sort field. */
  sortKey?: string;
  align?: "left" | "right" | "center";
  cell: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowKey: (row: T) => string;
  meta?: PageMeta;
  loading?: boolean;
  error?: Error | null;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSortChange?: (sortKey: string) => void;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  onRetry?: () => void;
}

const ALIGN: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  meta,
  loading,
  error,
  sortBy,
  sortOrder,
  onSortChange,
  onPageChange,
  onRowClick,
  empty,
  onRetry,
}: DataTableProps<T>) {
  if (error) {
    return (
      <ErrorState description={error.message} onRetry={onRetry} className="my-2" />
    );
  }

  const showSkeleton = loading && !rows;
  const isEmpty = !loading && rows && rows.length === 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {/* Scrolls both axes: wide tables scroll sideways, long ones scroll under
          the sticky header instead of pushing the page. */}
      <div className="max-h-[calc(100vh-14rem)] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((col) => {
                const active = col.sortKey && sortBy === col.sortKey;
                const sortable = Boolean(col.sortKey && onSortChange);
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      active ? (sortOrder === "asc" ? "ascending" : "descending") : undefined
                    }
                    className={cn(
                      "sticky top-0 z-10 border-b border-border bg-surface-2 px-3 py-2.5 text-xs font-semibold text-muted-foreground",
                      ALIGN[col.align ?? "left"],
                      col.headerClassName,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => onSortChange!(col.sortKey!)}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1 rounded px-1 -mx-1 hover:text-foreground",
                          col.align === "right" && "flex-row-reverse",
                          active && "text-foreground",
                        )}
                      >
                        {col.header}
                        {active ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : (
                            <ArrowDown className="size-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {showSkeleton && <TableSkeleton cols={columns.length} />}

            {rows?.map((row) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-t border-border transition-colors",
                  onRowClick && "cursor-pointer hover:bg-surface-2",
                  loading && "opacity-60",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-2.5 align-middle text-foreground",
                      ALIGN[col.align ?? "left"],
                      col.cellClassName,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}

            {isEmpty && (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && <Pagination meta={meta} onPageChange={onPageChange} />}
    </div>
  );
}
