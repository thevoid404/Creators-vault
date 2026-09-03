"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import type { Asset } from "@/lib/types";
import { Button, ButtonLink } from "@/components/ui/button";
import { AssetRow } from "@/components/assets/asset-row";

export function IngestResult({
  assets,
  onReset,
}: {
  assets: Asset[];
  onReset: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-surface p-6 text-center"
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-success-soft text-success-soft-foreground">
        <CheckCircle2 className="size-6" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-foreground">
        Added {assets.length} {assets.length === 1 ? "asset" : "assets"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        They&apos;re being indexed for search in the background.
      </p>

      <div className="mx-auto mt-5 max-w-md space-y-0.5 text-left">
        {assets.slice(0, 8).map((a) => (
          <AssetRow key={a.id} asset={a} />
        ))}
        {assets.length > 8 && (
          <p className="px-2 pt-2 text-xs text-subtle-foreground">
            + {assets.length - 8} more
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Button variant="secondary" onClick={onReset}>
          Add more
        </Button>
        <ButtonLink href="/assets">Go to assets</ButtonLink>
      </div>
    </motion.div>
  );
}
