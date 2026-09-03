"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import { ArrowLeft, Boxes, Eye, EyeOff, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { useMutation, useQuery } from "@/lib/hooks";
import { useToast } from "@/providers/toast-provider";
import {
  ASSET_TYPE_LABELS,
  LICENSE_LABELS,
  SOURCE_TYPE_LABELS,
  errorMessage,
  formatDateTime,
  formatSizeMB,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { IdChip } from "@/components/shared";

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const toast = useToast();
  const [confirming, setConfirming] = useState<"hide" | "restore" | null>(null);

  const { data, loading, error, refetch } = useQuery<Asset>(() => api.admin.asset(id), [id]);

  const hideMut = useMutation(() => api.admin.hideAsset(id));
  const restoreMut = useMutation(() => api.admin.restoreAsset(id));
  const busy = hideMut.loading || restoreMut.loading;

  async function run() {
    try {
      if (confirming === "hide") {
        await hideMut.mutate();
        toast.success("Asset hidden", "It no longer appears to its owner or in the platform.");
      } else if (confirming === "restore") {
        await restoreMut.mutate();
        toast.success("Asset restored", "It is visible to its owner again.");
      }
      setConfirming(null);
      refetch();
    } catch (err) {
      toast.error("Action failed", errorMessage(err));
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }
  if (error || !data) {
    return (
      <ErrorState title="Couldn't load this asset" description={error?.message} onRetry={refetch} />
    );
  }

  const a = data;
  const hidden = Boolean(a.deletedAt);

  const rows: [string, React.ReactNode][] = [
    ["Type", ASSET_TYPE_LABELS[a.type]],
    ["Category", a.category ?? "—"],
    ["Source", SOURCE_TYPE_LABELS[a.sourceType]],
    ["Source platform", a.sourcePlatform ?? "—"],
    ["License", LICENSE_LABELS[a.licenseType]],
    ["Size", formatSizeMB(a.fileSizeMB)],
    ["MIME", a.mimeType ?? "—"],
    ["Embedding", a.embeddingStatus],
    ["Project", a.project ? a.project.name : "—"],
    ["Section", a.section ?? "—"],
    ["Version", String(a.version)],
    ["Created", formatDateTime(a.createdAt)],
    ["Updated", formatDateTime(a.updatedAt)],
    ...(hidden ? ([["Hidden at", formatDateTime(a.deletedAt)]] as [string, React.ReactNode][]) : []),
  ];

  return (
    <div className="space-y-5">
      <Link
        href={"/assets" as Route}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All assets
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2">
            {a.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.previewUrl} alt="" className="size-full object-cover" />
            ) : (
              <Boxes className="size-6 text-subtle-foreground" />
            )}
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground">{a.title}</h1>
            {a.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {hidden ? <Badge tone="danger">Hidden</Badge> : <Badge tone="success">Live</Badge>}
              <Badge tone="neutral">{ASSET_TYPE_LABELS[a.type]}</Badge>
              <span className="text-xs text-muted-foreground">
                owner{" "}
                <Link href={`/assets?ownerId=${a.ownerId}` as Route} className="hover:underline">
                  <IdChip id={a.ownerId} />
                </Link>
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {hidden ? (
            <Button variant="secondary" size="sm" onClick={() => setConfirming("restore")} disabled={busy}>
              <Eye className="size-4" />
              Restore asset
            </Button>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirming("hide")} disabled={busy}>
              <EyeOff className="size-4" />
              Hide asset
            </Button>
          )}
          {a.fileUrl && (
            <a
              href={a.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[13px] font-semibold text-foreground hover:bg-surface-2"
            >
              <ExternalLink className="size-3.5" />
              Open file
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <dl className="divide-y divide-border">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 truncate text-right font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardBody>
              {a.tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tags.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {a.tags.map((t) => (
                    <Badge key={t.id} tone="neutral">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {a.sourceUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Source URL</CardTitle>
              </CardHeader>
              <CardBody>
                <a
                  href={a.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm text-primary hover:underline"
                >
                  {a.sourceUrl}
                </a>
              </CardBody>
            </Card>
          )}

          {a.purchase && (
            <Card>
              <CardHeader>
                <CardTitle>Purchase</CardTitle>
              </CardHeader>
              <CardBody className="space-y-1 text-sm">
                <p>
                  {a.purchase.price} {a.purchase.currency}
                </p>
                <p className="text-muted-foreground">{a.purchase.orderRef ?? "no order ref"}</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          open
          onClose={() => setConfirming(null)}
          onConfirm={run}
          loading={busy}
          danger={confirming === "hide"}
          title={confirming === "hide" ? `Hide “${a.title}”?` : `Restore “${a.title}”?`}
          description={
            confirming === "hide"
              ? "A soft delete. The owner loses access and the asset stops counting against their storage quota. The file is kept and this is reversible."
              : "The asset becomes visible to its owner again and counts against their quota."
          }
          confirmLabel={confirming === "hide" ? "Hide asset" : "Restore asset"}
        />
      )}
    </div>
  );
}
