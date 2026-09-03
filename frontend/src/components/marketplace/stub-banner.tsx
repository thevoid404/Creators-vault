"use client";

import { Info } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery } from "@/lib/hooks";

export function StubBanner() {
  const { data } = useQuery(() => api.payments.status(), []);
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-info-soft bg-info-soft/40 px-4 py-3 text-sm text-info-soft-foreground">
      <Info className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">Marketplace preview</p>
        <p className="mt-0.5 text-info-soft-foreground/90">
          Selling and payments aren&apos;t live yet. Listings below are samples, and any
          purchase runs against a mock provider —{" "}
          {data?.message ?? "no money moves"}.
        </p>
      </div>
    </div>
  );
}
