"use client";

import { Suspense } from "react";
import { Receipt, X } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminListTransactionsQuery, SortOrder, Transaction, TransactionStatus } from "@/lib/types";
import { useQuery, useQueryParams } from "@/lib/hooks";
import { TX_STATUS_TONE, formatCurrency, formatDateTime, titleCase } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StubNotice } from "@/components/ui/notice";
import { Badge } from "@/components/ui/badge";
import { IdChip } from "@/components/shared";

const PAGE_SIZE = 25;
const STATUSES: TransactionStatus[] = [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "refunded",
  "cancelled",
];

function TransactionsBrowser() {
  const { get, set } = useQueryParams();

  const page = Number(get("page") || "1");
  const sortBy = (get("sortBy") as AdminListTransactionsQuery["sortBy"]) || "createdAt";
  const sortOrder = (get("sortOrder") as SortOrder) || "desc";
  const status = get("status") || "";

  const { data, loading, error, refetch } = useQuery(
    () =>
      api.admin.transactions({
        page,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder,
        status: (status || undefined) as TransactionStatus | undefined,
      }),
    [page, sortBy, sortOrder, status],
  );

  const toggleSort = (key: string) =>
    set({
      sortBy: key,
      sortOrder: sortBy === key && sortOrder === "desc" ? "asc" : "desc",
      page: null,
    });

  const columns: Column<Transaction>[] = [
    { key: "id", header: "Transaction", cell: (t) => <IdChip id={t.id} /> },
    { key: "user", header: "User", cell: (t) => <IdChip id={t.userId} /> },
    {
      key: "amount",
      header: "Amount",
      sortKey: "amount",
      align: "right",
      cell: (t) => <span className="nums font-medium">{formatCurrency(t.amount, t.currency)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      cell: (t) => (
        <div className="flex flex-col gap-0.5">
          <Badge tone={TX_STATUS_TONE[t.status]}>{titleCase(t.status)}</Badge>
          {t.failureReason && (
            <span className="text-[11px] text-danger">{t.failureReason}</span>
          )}
        </div>
      ),
    },
    { key: "provider", header: "Provider", cell: (t) => <span className="text-muted-foreground">{t.provider}</span> },
    {
      key: "live",
      header: "Live",
      cell: (t) => (t.isLive ? <Badge tone="success">Live</Badge> : <Badge tone="warning">Mock</Badge>),
    },
    {
      key: "created",
      header: "Created",
      sortKey: "createdAt",
      align: "right",
      cell: (t) => <span className="nums text-muted-foreground">{formatDateTime(t.createdAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Every payment attempt recorded on the platform."
      />

      <StubNotice className="mb-4">
        <span className="font-semibold">All transactions are mock.</span> The backend runs{" "}
        <span className="font-mono">MockPaymentProvider</span> — rows here are real database
        records but <span className="font-semibold">no money moved</span> on any of them (an
        amount ending in <span className="font-mono">.99</span> is simulated as declined). This
        view shows what real-payment oversight will look like.
      </StubNotice>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onChange={(e) => set({ status: e.target.value || null, page: null })}
          className="w-auto"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
        {status && (
          <button
            type="button"
            onClick={() => set({ status: null, page: null })}
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
        getRowKey={(t) => t.id}
        meta={data?.meta}
        loading={loading}
        error={error}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={toggleSort}
        onPageChange={(p) => set({ page: p === 1 ? null : p })}
        onRetry={refetch}
        empty={
          <EmptyState
            icon={Receipt}
            title={status ? "No transactions with that status" : "No transactions yet"}
            description="Transactions appear once a user runs a marketplace purchase."
          />
        }
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={null}>
      <TransactionsBrowser />
    </Suspense>
  );
}
