"use client";

import { Suspense, useState } from "react";
import { Check, Store, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Listing } from "@/lib/types";
import { useMutation, useQuery, useQueryParams } from "@/lib/hooks";
import { useToast } from "@/providers/toast-provider";
import { LISTING_STATUS_TONE, errorMessage, formatCurrency, formatDate, titleCase } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StubNotice } from "@/components/ui/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { IdChip } from "@/components/shared";

function MarketplaceBrowser() {
  const { get, set } = useQueryParams();
  const toast = useToast();
  const pendingOnly = get("pendingOnly") === "1";
  const [pending, setPending] = useState<{ listing: Listing; action: "approve" | "reject" } | null>(
    null,
  );

  const { data, loading, error, refetch } = useQuery(
    () => api.admin.listings({ pendingOnly }),
    [pendingOnly],
  );

  const moderateMut = useMutation((action: "approve" | "reject", id: string) =>
    action === "approve" ? api.admin.approveListing(id) : api.admin.rejectListing(id),
  );

  async function run() {
    if (!pending) return;
    try {
      await moderateMut.mutate(pending.action, pending.listing.id);
      toast.success("Done", "Listing updated.");
      setPending(null);
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.isNotImplemented) {
        toast.info("Moderation is not wired yet", err.message);
      } else {
        toast.error("Action failed", errorMessage(err));
      }
      setPending(null);
    }
  }

  const columns: Column<Listing>[] = [
    {
      key: "listing",
      header: "Listing",
      cell: (l) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{l.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {l.itemCount} item{l.itemCount === 1 ? "" : "s"} · seller <IdChip id={l.seller.id} />
          </p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      cell: (l) => <span className="nums">{formatCurrency(l.price, l.currency)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (l) => <Badge tone={LISTING_STATUS_TONE[l.status]}>{titleCase(l.status)}</Badge>,
    },
    {
      key: "published",
      header: "Published",
      align: "right",
      cell: (l) => (
        <span className="nums text-muted-foreground">{l.publishedAt ? formatDate(l.publishedAt) : "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (l) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPending({ listing: l, action: "approve" })}
          >
            <Check className="size-3.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPending({ listing: l, action: "reject" })}
          >
            <X className="size-3.5" />
            Reject
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Marketplace listings"
        description="Review listings before they go live."
        actions={
          <button
            type="button"
            onClick={() => set({ pendingOnly: pendingOnly ? null : 1 })}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-surface-2"
          >
            {pendingOnly ? "Show all" : "Pending review only"}
          </button>
        }
      />

      <StubNotice className="mb-4">
        <span className="font-semibold">The marketplace is a backend stub.</span> These are the
        two sample listings — no real listings can be created yet, and{" "}
        <span className="font-semibold">Approve / Reject return “not implemented”</span> by
        design. The buttons are here so the review flow is ready the day the real marketplace
        ships.
      </StubNotice>

      <DataTable
        columns={columns}
        rows={data?.data}
        getRowKey={(l) => l.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        empty={
          <EmptyState
            icon={Store}
            title={pendingOnly ? "Nothing pending review" : "No listings"}
            description={pendingOnly ? "No sample listing is in draft status." : undefined}
          />
        }
      />

      {pending && (
        <ConfirmDialog
          open
          onClose={() => setPending(null)}
          onConfirm={run}
          loading={moderateMut.loading}
          danger={pending.action === "reject"}
          title={
            pending.action === "approve"
              ? `Approve “${pending.listing.title}”?`
              : `Reject “${pending.listing.title}”?`
          }
          description={
            pending.action === "approve"
              ? "The listing would be published to the marketplace."
              : "The seller would be told the listing was not accepted."
          }
          confirmLabel={pending.action === "approve" ? "Approve listing" : "Reject listing"}
        >
          <p className="text-xs text-muted-foreground">
            Note: the marketplace is stubbed, so this will return an honest “not implemented”
            response rather than changing anything.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={null}>
      <MarketplaceBrowser />
    </Suspense>
  );
}
