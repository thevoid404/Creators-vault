"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  Download,
  ExternalLink,
  FileStack,
  FolderKanban,
  GitBranch,
  Link2,
  Plus,
  ScrollText,
  Sparkles,
  Tag as TagIcon,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Asset, AssetNeighbour, LicenseType } from "@/lib/types";
import {
  ASSET_TYPE_LABELS,
  LICENSE_LABELS,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatSizeMB,
  titleCase,
} from "@/lib/utils";
import { useQuery } from "@/lib/hooks";
import { useToast } from "@/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyValueList } from "@/components/ui/key-value";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { LoadingRow } from "@/components/ui/skeleton";
import { Field, Select, Textarea } from "@/components/ui/field";
import { RelationshipItem } from "./relationship-item";
import { AddRelationshipDialog } from "./add-relationship-dialog";
import { SimilarAssets } from "@/components/assets/similar-assets";

type Neighbours = ReturnType<typeof useNeighbours>;

function useNeighbours(assetId: string) {
  return useQuery<AssetNeighbour[]>(() => api.assets.relationships(assetId), [assetId]);
}

/* ============================== Overview ============================== */

export function OverviewTab({
  asset,
  neighbours,
  onGoToTab,
}: {
  asset: Asset;
  neighbours: Neighbours;
  onGoToTab: (tab: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Description</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {asset.description || "No description yet."}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">Tags</h3>
          {asset.tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {asset.tags.map((t) => (
                <Link key={t.id} href={`/assets?tags=${t.slug}` as Route}>
                  <Badge tone="primary" className="hover:opacity-80">
                    <TagIcon className="size-3" />
                    {t.name}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No tags yet.</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Connections</h3>
            <button
              onClick={() => onGoToTab("relationships")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Manage
            </button>
          </div>
          {neighbours.initialLoading ? (
            <LoadingRow />
          ) : neighbours.data && neighbours.data.length ? (
            <div className="mt-2 space-y-2">
              {neighbours.data.slice(0, 3).map((n) => (
                <RelationshipItem
                  key={n.relationshipId}
                  neighbour={n}
                  onRemoved={neighbours.refetch}
                />
              ))}
              {neighbours.data.length > 3 && (
                <button
                  onClick={() => onGoToTab("relationships")}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  + {neighbours.data.length - 3} more connections
                </button>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Not connected to anything yet.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-1 text-sm font-semibold text-foreground">At a glance</h3>
          <KeyValueList
            items={[
              { label: "Type", value: ASSET_TYPE_LABELS[asset.type] },
              { label: "Category", value: asset.category || "—" },
              {
                label: "Project",
                value: asset.project ? (
                  <Link
                    href={`/projects/${asset.project.id}` as Route}
                    className="text-primary hover:underline"
                  >
                    {asset.project.name}
                  </Link>
                ) : (
                  "—"
                ),
              },
              { label: "License", value: LICENSE_LABELS[asset.licenseType] },
              { label: "Size", value: formatSizeMB(asset.fileSizeMB) },
              { label: "Added", value: formatDate(asset.createdAt) },
            ]}
          />
        </div>
        <SimilarAssets assetId={asset.id} />
      </div>
    </div>
  );
}

/* ============================== Files ============================== */

export function FilesTab({ asset }: { asset: Asset }) {
  const metaEntries = Object.entries(asset.metadata ?? {});

  return (
    <div className="space-y-6">
      {asset.fileUrl ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-surface-2 text-subtle-foreground">
              <FileStack className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                {(asset.metadata?.originalName as string) || asset.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {asset.mimeType || "unknown type"} · {formatSizeMB(asset.fileSizeMB)}
              </p>
            </div>
          </div>
          <a href={asset.fileUrl} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="sm">
              <Download className="size-4" />
              Open file
            </Button>
          </a>
        </div>
      ) : (
        <EmptyState
          icon={FileStack}
          title="No stored file"
          description={
            asset.sourceUrl
              ? "This asset points at an external URL rather than an uploaded file."
              : "This is a note or placeholder with no file attached."
          }
        />
      )}

      {asset.previewUrl && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Preview</h3>
          <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.previewUrl}
              alt={asset.title}
              className="mx-auto max-h-[28rem] w-auto object-contain"
            />
          </div>
        </div>
      )}

      {metaEntries.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">File metadata</h3>
          <div className="rounded-xl border border-border bg-surface p-4">
            <KeyValueList
              items={metaEntries.map(([k, v]) => ({
                label: titleCase(k),
                value:
                  typeof v === "string" || typeof v === "number" ? (
                    String(v)
                  ) : (
                    <code className="text-xs">{JSON.stringify(v)}</code>
                  ),
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================== Relationships ============================== */

export function RelationshipsTab({
  asset,
  neighbours,
}: {
  asset: Asset;
  neighbours: Neighbours;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Everything linked to this asset, in both directions. Each connection carries a
          short reason.
        </p>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Connect
        </Button>
      </div>

      {neighbours.error ? (
        <ErrorState onRetry={neighbours.refetch} />
      ) : neighbours.initialLoading ? (
        <LoadingRow />
      ) : neighbours.data && neighbours.data.length ? (
        <motion.div layout className="grid gap-2 sm:grid-cols-2">
          <AnimatePresence>
            {neighbours.data.map((n) => (
              <motion.div
                key={n.relationshipId}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <RelationshipItem neighbour={n} onRemoved={neighbours.refetch} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <EmptyState
          icon={GitBranch}
          title="No connections yet"
          description="Link this asset to the work it's used in, derived from, or bundled with."
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              Add the first connection
            </Button>
          }
        />
      )}

      <AddRelationshipDialog
        sourceAsset={asset}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={neighbours.refetch}
      />
    </div>
  );
}

/* ============================== Projects ============================== */

export function ProjectsTab({
  asset,
  neighbours,
  onUpdated,
}: {
  asset: Asset;
  neighbours: Neighbours;
  onUpdated: (a: Asset) => void;
}) {
  const toast = useToast();
  const { data: projects } = useQuery(
    () => api.projects.list({ limit: 100, sortBy: "name", sortOrder: "asc" }),
    [],
  );
  const [projectId, setProjectId] = useState(asset.project?.id ?? "");
  const [section, setSection] = useState(asset.section ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = projectId !== (asset.project?.id ?? "") || section !== (asset.section ?? "");
  const projectEdges = neighbours.data?.filter((n) => n.project) ?? [];

  async function save() {
    setSaving(true);
    try {
      const updated = await api.assets.update(asset.id, {
        projectId: projectId || undefined,
        section: section.trim() || undefined,
      });
      toast.success(projectId ? "Moved" : "Removed from project");
      onUpdated(updated);
    } catch (err) {
      toast.error("Couldn't move", err instanceof ApiError ? err.message : "Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-foreground">Project & section</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          An asset lives in one project. Sections are free-text sub-groups.
        </p>
        <div className="mt-4 space-y-4">
          <Field label="Project">
            {({ id }) => (
              <Select id={id} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">No project</option>
                {projects?.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Section">
            {({ id }) => (
              <Select
                id={id}
                value={section}
                onChange={(e) => setSection(e.target.value)}
                disabled={!projectId}
              >
                <option value="">No section</option>
                <SectionOptions projectId={projectId} current={asset.section} />
              </Select>
            )}
          </Field>
          <Button onClick={save} loading={saving} disabled={!dirty} size="sm">
            Save
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground">Linked projects</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Relationship edges that point at a project (separate from where it lives).
        </p>
        <div className="mt-3 space-y-2">
          {projectEdges.length ? (
            projectEdges.map((n) => (
              <RelationshipItem
                key={n.relationshipId}
                neighbour={n}
                onRemoved={neighbours.refetch}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No project links.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionOptions({
  projectId,
  current,
}: {
  projectId: string;
  current: string | null;
}) {
  const { data } = useQuery(
    () => api.projects.sections(projectId),
    [projectId],
    { enabled: Boolean(projectId) },
  );
  const names = new Set<string>();
  data?.forEach((s) => s.section && names.add(s.section));
  if (current) names.add(current);
  return (
    <>
      {[...names].map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </>
  );
}

/* ============================== Source ============================== */

export function SourceTab({ asset }: { asset: Asset }) {
  const items: { label: string; value: React.ReactNode }[] = [
    { label: "Source", value: titleCase(asset.sourceType) },
  ];
  if (asset.sourceUrl) {
    items.push({
      label: "URL",
      value: (
        <a
          href={asset.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 break-all text-primary hover:underline"
        >
          {asset.sourceUrl}
          <ExternalLink className="size-3 shrink-0" />
        </a>
      ),
    });
  }
  if (asset.sourcePlatform) items.push({ label: "Platform", value: asset.sourcePlatform });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-4">
        <KeyValueList items={items} />
      </div>

      {asset.purchase ? (
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
            <ScrollText className="size-4 text-subtle-foreground" />
            Purchase record
          </h3>
          <KeyValueList
            items={[
              {
                label: "Price",
                value: `${asset.purchase.price.toFixed(2)} ${asset.purchase.currency}`,
              },
              { label: "Date", value: formatDate(asset.purchase.date) },
              { label: "Order ref", value: asset.purchase.orderRef || "—" },
            ]}
          />
          <p className="mt-3 text-xs text-subtle-foreground">
            Entered by hand — no marketplace was contacted.
          </p>
        </div>
      ) : asset.sourceType === "marketplace_link" ? (
        <p className="text-sm text-muted-foreground">No purchase details were recorded.</p>
      ) : null}
    </div>
  );
}

/* ============================== License ============================== */

export function LicenseTab({
  asset,
  onUpdated,
}: {
  asset: Asset;
  onUpdated: (a: Asset) => void;
}) {
  const toast = useToast();
  const [licenseType, setLicenseType] = useState<LicenseType>(asset.licenseType);
  const [licenseNote, setLicenseNote] = useState(asset.licenseNote ?? "");
  const [saving, setSaving] = useState(false);
  const dirty =
    licenseType !== asset.licenseType || licenseNote !== (asset.licenseNote ?? "");

  async function save() {
    setSaving(true);
    try {
      const updated = await api.assets.update(asset.id, {
        licenseType,
        licenseNote: licenseNote.trim() || undefined,
      });
      toast.success("License updated");
      onUpdated(updated);
    } catch {
      toast.error("Couldn't update the license");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-lg border border-info-soft bg-info-soft/40 px-3 py-2.5 text-xs text-info-soft-foreground">
        License documents are never parsed. This is a label you set yourself.
      </div>
      <Field label="License">
        {({ id }) => (
          <Select
            id={id}
            value={licenseType}
            onChange={(e) => setLicenseType(e.target.value as LicenseType)}
          >
            {(Object.keys(LICENSE_LABELS) as LicenseType[]).map((l) => (
              <option key={l} value={l}>
                {LICENSE_LABELS[l]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Note" hint="Where you can use it, restrictions, attribution…">
        {({ id }) => (
          <Textarea
            id={id}
            value={licenseNote}
            onChange={(e) => setLicenseNote(e.target.value)}
            maxLength={2000}
          />
        )}
      </Field>
      <Button onClick={save} loading={saving} disabled={!dirty} size="sm">
        Save license
      </Button>
    </div>
  );
}

/* ============================== Versions ============================== */

export function VersionsTab({ asset, neighbours }: { asset: Asset; neighbours: Neighbours }) {
  const versionEdges =
    neighbours.data?.filter((n) => n.relationType === "version_of" && n.asset) ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
            <GitBranch className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Version {asset.version}</p>
            <p className="text-xs text-muted-foreground">
              The current revision number for this asset.
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-subtle-foreground">
          A full version history isn&apos;t exposed by the API. To track revisions, connect
          assets with a &ldquo;version of&rdquo; relationship.
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Other versions</h3>
        {versionEdges.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {versionEdges.map((n) => (
              <RelationshipItem
                key={n.relationshipId}
                neighbour={n}
                onRemoved={neighbours.refetch}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No assets are linked as versions of this one.
          </p>
        )}
      </div>
    </div>
  );
}

/* ============================== Activity ============================== */

const EMBEDDING_COPY: Record<Asset["embeddingStatus"], { label: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  ready: { label: "Indexed for semantic search", tone: "success" },
  pending: { label: "Waiting to be indexed", tone: "warning" },
  failed: { label: "Indexing failed — try a reindex from Search", tone: "danger" },
  skipped: { label: "Not indexed (skipped)", tone: "neutral" },
};

export function ActivityTab({ asset }: { asset: Asset }) {
  const embedding = EMBEDDING_COPY[asset.embeddingStatus];
  return (
    <div className="max-w-xl">
      <div className="rounded-xl border border-border bg-surface p-4">
        <KeyValueList
          items={[
            {
              label: "Created",
              value: `${formatDateTime(asset.createdAt)} · ${formatRelativeTime(asset.createdAt)}`,
            },
            {
              label: "Last updated",
              value: `${formatDateTime(asset.updatedAt)} · ${formatRelativeTime(asset.updatedAt)}`,
            },
            {
              label: "Search index",
              value: <Badge tone={embedding.tone}>{embedding.label}</Badge>,
            },
            ...(asset.deletedAt
              ? [
                  {
                    label: "Trashed",
                    value: (
                      <span className="text-danger">
                        {formatDateTime(asset.deletedAt)}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    </div>
  );
}

/* ============================== Tab registry ============================== */

export const ASSET_TAB_META = [
  { value: "overview", label: "Overview", icon: <Sparkles className="size-4" /> },
  { value: "files", label: "Files", icon: <FileStack className="size-4" /> },
  { value: "relationships", label: "Relationships", icon: <GitBranch className="size-4" /> },
  { value: "projects", label: "Projects", icon: <FolderKanban className="size-4" /> },
  { value: "source", label: "Source", icon: <Link2 className="size-4" /> },
  { value: "license", label: "License", icon: <ScrollText className="size-4" /> },
  { value: "versions", label: "Versions", icon: <GitBranch className="size-4" /> },
  { value: "activity", label: "Activity", icon: <Activity className="size-4" /> },
] as const;

export { useNeighbours };
