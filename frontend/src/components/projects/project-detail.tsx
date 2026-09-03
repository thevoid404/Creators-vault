"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Boxes,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { api, ApiError } from "@/lib/api";
import type { Asset, Project } from "@/lib/types";
import { useQuery } from "@/lib/hooks";
import { useToast } from "@/providers/toast-provider";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState, EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/skeleton";
import { AssetCard, AssetCardGrid } from "@/components/assets/asset-card";
import { ProjectFormDialog } from "./project-form-dialog";
import { AddToProjectDialog } from "./add-to-project-dialog";

const UNGROUPED = "__ungrouped__";

export function ProjectDetail({ projectId }: { projectId: string }) {
  const router = useRouter();
  const toast = useToast();

  const {
    data: project,
    initialLoading,
    error,
    refetch,
  } = useQuery<Project>(() => api.projects.byId(projectId), [projectId]);

  const [localProject, setLocalProject] = useState<Project | null>(null);
  const current = localProject ?? project ?? null;

  const [assetsKey, setAssetsKey] = useState(0);
  const { data: assetsPage, loading: assetsLoading } = useQuery(
    () => api.projects.assets(projectId, { limit: 100, sortBy: "updatedAt", sortOrder: "desc" }),
    [projectId, assetsKey],
  );

  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const a of assetsPage?.data ?? []) {
      const k = a.section || UNGROUPED;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === UNGROUPED) return 1;
      if (b[0] === UNGROUPED) return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [assetsPage]);

  async function act(
    fn: () => Promise<Project>,
    successMsg: string,
    { redirect }: { redirect?: boolean } = {},
  ) {
    setActing(true);
    try {
      const updated = await fn();
      toast.success(successMsg);
      if (redirect) {
        router.push("/projects" as Route);
      } else {
        setLocalProject(updated);
      }
    } catch (err) {
      toast.error(
        "Something went wrong",
        err instanceof ApiError ? err.message : "Try again.",
      );
    } finally {
      setActing(false);
      setDeleteOpen(false);
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
          title="Project not found"
          description="It may have been deleted, or it belongs to someone else."
          onRetry={refetch}
        />
      </div>
    );
  }

  const p = current;
  const accent = p.color || "var(--color-primary)";
  const truncated = (assetsPage?.meta.total ?? 0) > (assetsPage?.data.length ?? 0);

  return (
    <div>
      <Link
        href={"/projects" as Route}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Projects
      </Link>

      {p.deletedAt && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-warning-soft bg-warning-soft/50 px-4 py-3 text-sm text-warning-soft-foreground">
          <span>This project is deleted. Its assets are unaffected.</span>
          <Button
            size="sm"
            variant="secondary"
            loading={acting}
            onClick={() => act(() => api.projects.restore(projectId), "Project restored")}
          >
            <RotateCcw className="size-4" />
            Restore
          </Button>
        </div>
      )}
      {p.archivedAt && !p.deletedAt && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted-foreground">
          <span>This project is archived — hidden from the default list.</span>
          <Button
            size="sm"
            variant="secondary"
            loading={acting}
            onClick={() => act(() => api.projects.unarchive(projectId), "Project unarchived")}
          >
            <ArchiveRestore className="size-4" />
            Unarchive
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
        <div
          className="h-24 w-full"
          style={{
            background: p.coverUrl
              ? undefined
              : `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 45%, transparent))`,
          }}
        >
          {p.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.coverUrl} alt="" className="size-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {p.name}
            </h1>
            {p.description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {p.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Boxes className="size-3.5" />
                {p.assetCount} live {p.assetCount === 1 ? "asset" : "assets"}
              </span>
              <span>Updated {formatRelativeTime(p.updatedAt)}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add assets
            </Button>
            <Menu
              align="end"
              trigger={
                <span className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground hover:bg-surface-2">
                  <MoreHorizontal className="size-4" />
                </span>
              }
            >
              <MenuItem icon={<Pencil />} onClick={() => setEditOpen(true)}>
                Edit project
              </MenuItem>
              {p.archivedAt ? (
                <MenuItem
                  icon={<ArchiveRestore />}
                  onClick={() => act(() => api.projects.unarchive(projectId), "Unarchived")}
                >
                  Unarchive
                </MenuItem>
              ) : (
                <MenuItem
                  icon={<Archive />}
                  onClick={() => act(() => api.projects.archive(projectId), "Archived")}
                >
                  Archive
                </MenuItem>
              )}
              <MenuSeparator />
              {p.deletedAt ? (
                <MenuItem
                  icon={<RotateCcw />}
                  onClick={() => act(() => api.projects.restore(projectId), "Restored")}
                >
                  Restore
                </MenuItem>
              ) : (
                <MenuItem icon={<Trash2 />} danger onClick={() => setDeleteOpen(true)}>
                  Delete project
                </MenuItem>
              )}
            </Menu>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="mt-6 space-y-4">
        {assetsLoading && !assetsPage ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No assets in this project"
            description="Add assets and optionally group them into sections like UI, Brand, Development."
            action={<Button onClick={() => setAddOpen(true)}>Add assets</Button>}
          />
        ) : (
          grouped.map(([section, assets]) => {
            const isCollapsed = collapsed.has(section);
            const label = section === UNGROUPED ? "Ungrouped" : section;
            return (
              <section key={section} className="rounded-xl border border-border bg-surface">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      next.has(section) ? next.delete(section) : next.add(section);
                      return next;
                    })
                  }
                  className="flex w-full items-center justify-between px-4 py-3"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {label}
                    <span className="rounded-full bg-surface-2 px-1.5 text-xs text-muted-foreground">
                      {assets.length}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-subtle-foreground transition-transform",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border p-4">
                        <AssetCardGrid>
                          {assets.map((a) => (
                            <AssetCard key={a.id} asset={a} />
                          ))}
                        </AssetCardGrid>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            );
          })
        )}

        {truncated && (
          <p className="text-center text-xs text-subtle-foreground">
            Showing the 100 most recent.{" "}
            <Link
              href={`/assets?projectId=${projectId}` as Route}
              className="font-medium text-primary hover:underline"
            >
              See all in Assets
            </Link>
          </p>
        )}
      </div>

      {editOpen && (
        <ProjectFormDialog
          project={p}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => setLocalProject(updated)}
        />
      )}
      <AddToProjectDialog
        projectId={projectId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => {
          setAssetsKey((k) => k + 1);
          refetch();
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() =>
          act(() => api.projects.remove(projectId), "Project deleted", { redirect: true })
        }
        title="Delete this project?"
        description="Its assets keep their place in your library and stay searchable. You can restore the project later."
        confirmLabel="Delete project"
        danger
        loading={acting}
      />
    </div>
  );
}
