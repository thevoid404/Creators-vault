"use client";

import { useState } from "react";
import { CreditCard, Info } from "lucide-react";
import { api } from "@/lib/api";
import type { Transaction, TransactionStatus } from "@/lib/types";
import { useQuery } from "@/lib/hooks";
import { useToast } from "@/providers/toast-provider";
import { formatCurrency, formatDateTime, titleCase } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { LoadingRow } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";

const STATUS_TONE: Record<TransactionStatus, "success" | "danger" | "warning" | "neutral" | "info"> = {
  succeeded: "success",
  failed: "danger",
  refunded: "info",
  cancelled: "neutral",
  pending: "warning",
  processing: "warning",
};

export default function BillingSettingsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const { data: status } = useQuery(() => api.payments.status(), []);
  const { data, loading, error, refetch } = useQuery(
    () => api.payments.transactions({ page, limit: 20, sortBy: "createdAt", sortOrder: "desc" }),
    [page],
  );
  const [refunding, setRefunding] = useState<string | null>(null);

  async function refund(txn: Transaction) {
    setRefunding(txn.id);
    try {
      await api.payments.refund(txn.id, { reason: "Requested from billing settings" });
      toast.success("Refunded (mock)");
      refetch();
    } catch {
      toast.error("Couldn't refund that transaction");
    } finally {
      setRefunding(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex items-start gap-2.5 rounded-xl border border-info-soft bg-info-soft/40 px-4 py-3 text-sm text-info-soft-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>{status?.message ?? "Payments are stubbed — transactions are recorded, but no money moves."}</p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Transactions</h2>
        {error ? (
          <ErrorState onRetry={refetch} description={error.message} />
        ) : loading && !data ? (
          <LoadingRow />
        ) : data && data.data.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No transactions yet"
            description="Purchases you make in the marketplace preview show up here."
          />
        ) : (
          <div className="space-y-4">
            <div className="divide-y divide-border rounded-xl border border-border bg-surface">
              {data?.data.map((txn) => (
                <div key={txn.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(txn.amount, txn.currency)}
                      </p>
                      <Badge tone={STATUS_TONE[txn.status]}>{titleCase(txn.status)}</Badge>
                      {!txn.isLive && (
                        <span className="text-[11px] text-subtle-foreground">mock</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(txn.createdAt)} · {txn.provider}
                    </p>
                    {txn.failureReason && (
                      <p className="mt-0.5 text-xs text-danger">{txn.failureReason}</p>
                    )}
                  </div>
                  {txn.status === "succeeded" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={refunding === txn.id}
                      onClick={() => refund(txn)}
                    >
                      Refund
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Pagination meta={data?.meta} onPageChange={setPage} />
          </div>
        )}
      </section>
    </div>
  );
}
