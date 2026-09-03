"use client";

import { Suspense, useState } from "react";
import { FolderKanban, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { useQuery, useQueryParams } from "@/lib/hooks";
import { PageHeader } from "@/components/layout/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  ProjectCard,
  ProjectGrid,
  ProjectCardSkeleton,
} from "@/components/projects/project-card";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";

function ProjectsInner() {
  const { get, set, searchParams } = useQueryParams();
  const deleted = get("deleted") === "1";
  const includeArchived = get("archived") === "1";
  const page = Number(get("page") || "1");
  const sortBy = get("sortBy") || "createdAt";
  const sortOrder = (get("sortOrder") as "asc" | "desc") || "desc";

  const [createOpen, setCreateOpen] = useState(false);

  const key = searchParams.toString();
  const { data, loading, error, refetch } = useQuery(
    () =>
      api.projects.list({
        page,
        limit: 24,
        sortBy: sortBy as "createdAt",
        sortOrder,
        includeArchived: includeArchived || undefined,
        deleted: deleted || undefined,
      }),
    [key],
  );

  return (
    <div>
      <PageHeader
        title={deleted ? "Deleted projects" : "Projects"}
        description={
          deleted
            ? "Soft-deleted projects. Their assets keep their place and stay in your library."
            : "Group related assets — UI, brand, code — and work through them by section."
        }
        actions={
          deleted ? (
            <ButtonLink href="/projects" variant="secondary">
              Back to projects
            </ButtonLink>
          ) : (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New project
            </Button>
          )
        }
      />

      {!deleted && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Checkbox
            checked={includeArchived}
            onChange={(v) => set({ archived: v ? 1 : null, page: null })}
            label="Show archived"
          />
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(":");
                set({ sortBy: sb, sortOrder: so, page: null });
              }}
              className="h-9 w-auto"
            >
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="updatedAt:desc">Recently updated</option>
              <option value="name:asc">Name A–Z</option>
              <option value="name:desc">Name Z–A</option>
            </Select>
          </div>
        </div>
      )}

      {error ? (
        <ErrorState onRetry={refetch} description={error.message} />
      ) : loading && !data ? (
        <ProjectGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </ProjectGrid>
      ) : data && data.data.length === 0 ? (
        <EmptyState
          icon={deleted ? Trash2 : FolderKanban}
          title={deleted ? "No deleted projects" : "No projects yet"}
          description={
            deleted
              ? "Deleted projects appear here and can be restored."
              : "Create your first project to start organizing."
          }
          action={
            !deleted ? (
              <Button onClick={() => setCreateOpen(true)}>Create a project</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          <ProjectGrid>
            {data?.data.map((p: Project) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </ProjectGrid>
          <Pagination meta={data?.meta} onPageChange={(p) => set({ page: p === 1 ? null : p })} />
        </div>
      )}

      {!deleted && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => set({ deleted: 1, page: null })}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3.5" />
            View deleted projects
          </button>
        </div>
      )}

      <ProjectFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => refetch()}
      />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsInner />
    </Suspense>
  );
}
