"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Link as LinkIcon,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/hooks";
import { useToast } from "@/providers/toast-provider";
import { ASSET_TYPE_LABELS, LICENSE_LABELS, titleCase } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Tabs } from "@/components/ui/tabs";
import { ErrorState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/skeleton";
import { AssetPreview } from "@/components/assets/asset-preview";
import { useQueryParams } from "@/lib/hooks";
import { AssetEditDialog } from "./asset-edit-dialog";
import {
  ASSET_TAB_META,
  ActivityTab,
  FilesTab,
  LicenseTab,
  OverviewTab,
  ProjectsTab,
  RelationshipsTab,
  SourceTab,
  VersionsTab,
  useNeighbours,
} from "./asset-tabs";

export function AssetDetail({ assetId }: { assetId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { refreshUser } = useAuth();
  const { get, set } = useQueryParams();
  const tab = get("tab") ?? "overview";

  const { data: asset, initialLoading, error, refetch } = useQuery<Asset>(
    () => api.assets.byId(assetId),
    [assetId],
  );
  const neighbours = useNeighbours(assetId);

  const [localAsset, setLocalAsset] = useState<Asset | null>(null);
  const current = localAsset ?? asset ?? null;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [acting, setActing] = useState(false);

  function applyUpdate(updated: Asset) {
    setLocalAsset(updated);
  }

  async function remove() {
    setActing(true);
    try {
      await api.assets.remove(assetId);
      await refreshUser();
      toast.success("Moved to trash");
      router.push("/assets" as Route);
    } catch {
      toast.error("Couldn't delete this asset");
      setActing(false);
      setDeleteOpen(false);
    }
  }

  async function restore() {
    setActing(true);
    try {
      const restored = await api.assets.restore(assetId);
      await refreshUser();
      setLocalAsset(restored);
      toast.success("Restored");
    } catch (err) {
      toast.error(
        "Couldn't restore",
        err instanceof ApiError && err.status === 413
          ? "Restoring would exceed your storage quota."
          : "Try again.",
      );
    } finally {
      setActing(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className="mx-auto max-w-md py-16">
        <ErrorState
          title="Asset not found"
          description="It may have been deleted, or it belongs to someone else."
          onRetry={refetch}
        />
        <div className="mt-4 text-center">
          <Link href={"/assets" as Route} className="text-sm font-medium text-primary hover:underline">
            Back to assets
          </Link>
        </div>
      </div>
    );
  }

  const a = current;

  const panels: Record<string, React.ReactNode> = {
    overview: <OverviewTab asset={a} neighbours={neighbours} onGoToTab={(t) => set({ tab: t })} />,
    files: <FilesTab asset={a} />,
    relationships: <RelationshipsTab asset={a} neighbours={neighbours} />,
    projects: <ProjectsTab asset={a} neighbours={neighbours} onUpdated={applyUpdate} />,
    source: <SourceTab asset={a} />,
    license: <LicenseTab asset={a} onUpdated={applyUpdate} />,
    versions: <VersionsTab asset={a} neighbours={neighbours} />,
    activity: <ActivityTab asset={a} />,
  };

  return (
    <div>
      <Link
        href={"/assets" as Route}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Assets
      </Link>

      {a.deletedAt && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-warning-soft bg-warning-soft/50 px-4 py-3 text-sm text-warning-soft-foreground">
          <span>This asset is in the trash. Its file is kept and it can be restored.</span>
          <Button size="sm" variant="secondary" onClick={restore} loading={acting}>
            <RotateCcw className="size-4" />
            Restore
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <AssetPreview
          asset={a}
          className="h-28 w-full shrink-0 sm:h-24 sm:w-40"
          rounded="rounded-xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {a.title}
            </h1>
            <Menu
              align="end"
              trigger={
                <span className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-2">
                  <MoreHorizontal className="size-4" />
                </span>
              }
            >
              <MenuItem icon={<Pencil />} onClick={() => setEditOpen(true)}>
                Edit details
              </MenuItem>
              {a.fileUrl && (
                <MenuItem
                  icon={<Download />}
                  onClick={() => window.open(a.fileUrl!, "_blank")}
                >
                  Open file
                </MenuItem>
              )}
              {a.sourceUrl && (
                <MenuItem
                  icon={<ExternalLink />}
                  onClick={() => window.open(a.sourceUrl!, "_blank")}
                >
                  Open source
                </MenuItem>
              )}
              <MenuItem
                icon={<LinkIcon />}
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  toast.success("Link copied");
                }}
              >
                Copy link
              </MenuItem>
              <MenuSeparator />
              {a.deletedAt ? (
                <MenuItem icon={<RotateCcw />} onClick={restore}>
                  Restore
                </MenuItem>
              ) : (
                <MenuItem icon={<Trash2 />} danger onClick={() => setDeleteOpen(true)}>
                  Move to trash
                </MenuItem>
              )}
            </Menu>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{ASSET_TYPE_LABELS[a.type]}</Badge>
            <Badge tone="neutral">{titleCase(a.sourceType)}</Badge>
            {a.licenseType !== "unknown" && (
              <Badge tone="info">{LICENSE_LABELS[a.licenseType]}</Badge>
            )}
            {a.project && (
              <Link href={`/projects/${a.project.id}` as Route}>
                <Badge tone="primary" className="hover:opacity-80">
                  {a.project.name}
                  {a.section ? ` · ${a.section}` : ""}
                </Badge>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6">
        <Tabs
          items={ASSET_TAB_META.map((t) => ({
            ...t,
            count:
              t.value === "relationships" && neighbours.data
                ? neighbours.data.length
                : undefined,
          }))}
          value={tab}
          onChange={(t) => set({ tab: t === "overview" ? null : t })}
          layoutId="asset-tab"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="mt-6"
        >
          {panels[tab] ?? panels.overview}
        </motion.div>
      </AnimatePresence>

      {editOpen && (
        <AssetEditDialog
          asset={a}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            applyUpdate(updated);
            neighbours.refetch();
          }}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={remove}
        title="Move this asset to trash?"
        description="It stops counting against your storage and can be restored later. The file is kept."
        confirmLabel="Move to trash"
        danger
        loading={acting}
      />
    </div>
  );
}
