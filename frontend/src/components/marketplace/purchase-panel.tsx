"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Listing, PurchaseResult, Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { Button } from "@/components/ui/button";

export function PurchasePanel({ listing }: { listing: Listing }) {
  const toast = useToast();
  const [starting, setStarting] = useState(false);
  const [session, setSession] = useState<PurchaseResult | null>(null);
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [simulating, setSimulating] = useState<null | "succeeded" | "failed">(null);

  async function start() {
    setStarting(true);
    try {
      const origin = window.location.origin;
      const result = await api.marketplace.purchase(listing.id, {
        successUrl: `${origin}/settings/billing`,
        cancelUrl: `${origin}/marketplace/${listing.id}`,
      });
      setSession(result);
    } catch (err) {
      if (err instanceof ApiError && err.isNotImplemented) {
        toast.error("Not available", "Purchasing isn't implemented in this build.");
      } else {
        toast.error(
          "Couldn't start checkout",
          err instanceof ApiError ? err.message : "Try again.",
        );
      }
    } finally {
      setStarting(false);
    }
  }

  async function refreshTxn(id: string) {
    try {
      setTxn(await api.payments.transaction(id));
    } catch {
      /* ignore */
    }
  }

  async function simulate(outcome: "succeeded" | "failed") {
    if (!session) return;
    setSimulating(outcome);
    try {
      // `.99` amounts are declined by the mock provider; nudge accordingly.
      const amount =
        outcome === "failed"
          ? Math.floor(listing.price) + 0.99
          : Math.round(listing.price * 100) / 100 || 10;
      await api.payments.simulateWebhook({
        transactionId: session.transactionId,
        status: outcome,
        amount,
      });
      await refreshTxn(session.transactionId);
    } catch {
      toast.error("Simulation failed");
    } finally {
      setSimulating(null);
    }
  }

  const status = txn?.status ?? session?.status;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-2xl font-bold tracking-tight text-foreground">
        {formatCurrency(listing.price, listing.currency)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {listing.itemCount} {listing.itemCount === 1 ? "asset" : "assets"} · one-time
      </p>

      {!session ? (
        <>
          <Button className="mt-4 w-full" onClick={start} loading={starting}>
            Buy this pack
          </Button>
          <p className="mt-2 text-center text-[11px] text-subtle-foreground">
            Mock checkout — no card, no charge.
          </p>
        </>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
            {status === "succeeded" ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : status === "failed" ? (
              <XCircle className="size-4 text-danger" />
            ) : (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            )}
            <span className="font-medium text-foreground">
              {status === "succeeded"
                ? "Payment succeeded (mock)"
                : status === "failed"
                  ? "Payment failed"
                  : "Awaiting payment"}
            </span>
          </div>

          {txn?.failureReason && (
            <p className="text-xs text-danger">{txn.failureReason}</p>
          )}

          {status !== "succeeded" && status !== "failed" && (
            <>
              <a href={session.checkoutUrl} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="sm" className="w-full">
                  <ExternalLink className="size-4" />
                  Open mock checkout page
                </Button>
              </a>
              <div className="rounded-lg border border-dashed border-border-strong p-2.5">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
                  Testing helpers
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    loading={simulating === "succeeded"}
                    onClick={() => simulate("succeeded")}
                  >
                    Simulate success
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    loading={simulating === "failed"}
                    onClick={() => simulate("failed")}
                  >
                    Simulate failure
                  </Button>
                </div>
              </div>
            </>
          )}

          <Link
            href={"/settings/billing" as Route}
            className="block text-center text-xs font-medium text-primary hover:underline"
          >
            View in transactions
          </Link>
        </div>
      )}
    </div>
  );
}
