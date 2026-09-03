"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { motion } from "motion/react";
import {
  Boxes,
  FolderKanban,
  Search,
  Sparkles,
  TriangleAlert,
  Plus,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/hooks";
import { formatPercent } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { Section } from "@/components/ui/section";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetRow } from "@/components/assets/asset-row";
import { ProjectCard, ProjectGrid, ProjectCardSkeleton } from "@/components/projects/project-card";
import { ButtonLink } from "@/components/ui/button";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function attentionReason(asset: Asset): string | null {
  if (asset.embeddingStatus === "failed") return "Search indexing failed";
  if (!asset.project) return "No project";
  if (asset.tags.length === 0) return "No tags";
  if (!asset.description) return "No description";
  return null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [term, setTerm] = useState("");

  const { data, initialLoading, error, refetch } = useQuery(async () => {
    const [totalRes, recent, projects, updated, scan] = await Promise.all([
      api.assets.list({ limit: 1 }),
      api.assets.list({ limit: 8, sortBy: "createdAt", sortOrder: "desc" }),
      api.projects.list({ limit: 6, sortBy: "updatedAt", sortOrder: "desc" }),
      api.assets.list({ limit: 6, sortBy: "updatedAt", sortOrder: "desc" }),
      api.assets.list({ limit: 60, sortBy: "updatedAt", sortOrder: "desc" }),
    ]);
    return { totalRes, recent, projects, updated, scan };
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const total = data.totalRes.meta.total;
    const organized = data.projects.data.reduce((sum, p) => sum + p.assetCount, 0);
    const needsAttention = data.scan.data.filter((a) => attentionReason(a));
    return {
      total,
      organizedPct: total > 0 ? (organized / total) * 100 : 0,
      activeProjects: data.projects.meta.total,
      needsAttention,
    };
  }, [data]);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = term.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}` as Route);
  }

  return (
    <div className="space-y-6">
      {/* Greeting + search */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {greeting()}
          {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s a calm look at your vault.
        </p>

        <form onSubmit={runSearch} className="relative mt-4 max-w-2xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-subtle-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search your assets — try “dark dashboard mockup”"
            aria-label="Search your assets"
            className="h-12 w-full rounded-xl border border-border bg-surface pl-12 pr-4 text-sm text-foreground shadow-sm placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:outline-1 focus-visible:outline-primary"
          />
        </form>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total assets"
          value={stats ? stats.total.toLocaleString() : "—"}
          icon={Boxes}
          tone="primary"
          loading={initialLoading}
        />
        <StatCard
          label="Organized"
          value={stats ? formatPercent(stats.organizedPct) : "—"}
          hint="in a project"
          icon={Sparkles}
          tone="success"
          loading={initialLoading}
        />
        <StatCard
          label="Active projects"
          value={stats ? stats.activeProjects : "—"}
          icon={FolderKanban}
          tone="info"
          loading={initialLoading}
        />
        <StatCard
          label="Needs attention"
          value={stats ? stats.needsAttention.length : "—"}
          hint="recent items to tidy"
          icon={TriangleAlert}
          tone="warning"
          loading={initialLoading}
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-danger-soft bg-danger-soft/40 px-4 py-3 text-sm text-danger-soft-foreground">
          Couldn&apos;t load your dashboard.{" "}
          <button onClick={refetch} className="font-semibold underline">
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recently added */}
        <Section title="Recently added" viewAllHref="/assets?sortBy=createdAt">
          {initialLoading ? (
            <SkeletonRows />
          ) : data && data.recent.data.length > 0 ? (
            <div className="space-y-0.5">
              {data.recent.data.map((a) => (
                <AssetRow key={a.id} asset={a} timeField="createdAt" />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Plus}
              title="No assets yet"
              description="Upload a file or import a link to get started."
              action={<ButtonLink href="/assets/new">Add your first asset</ButtonLink>}
            />
          )}
        </Section>

        {/* Needs attention */}
        <Section
          title="Needs attention"
          description="Recent items missing a project, tags or a description"
          viewAllHref="/assets"
        >
          {initialLoading ? (
            <SkeletonRows />
          ) : stats && stats.needsAttention.length > 0 ? (
            <div className="space-y-0.5">
              {stats.needsAttention.slice(0, 6).map((a) => (
                <AssetRow
                  key={a.id}
                  asset={a}
                  timeField="updatedAt"
                  note={attentionReason(a) ?? undefined}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Everything's tidy"
              description="Your recent assets all have a project, tags and a description."
            />
          )}
        </Section>
      </div>

      {/* Projects */}
      <Section title="Projects" viewAllHref="/projects">
        {initialLoading ? (
          <ProjectGrid>
            {Array.from({ length: 3 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </ProjectGrid>
        ) : data && data.projects.data.length > 0 ? (
          <ProjectGrid>
            {data.projects.data.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </ProjectGrid>
        ) : (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Group related assets — UI, brand, code — into a project."
            action={<ButtonLink href="/projects" variant="secondary">Create a project</ButtonLink>}
          />
        )}
      </Section>

      {/* Recently used */}
      <Section title="Recently used" description="Assets you touched most recently" viewAllHref="/assets?sortBy=updatedAt">
        {initialLoading ? (
          <SkeletonRows />
        ) : data && data.updated.data.length > 0 ? (
          <motion.div layout className="grid gap-0.5 sm:grid-cols-2">
            {data.updated.data.map((a) => (
              <AssetRow key={a.id} asset={a} timeField="updatedAt" />
            ))}
          </motion.div>
        ) : (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nothing used recently.
          </p>
        )}
      </Section>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-2">
          <div className="size-10 animate-pulse rounded-md bg-surface-3" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-surface-3" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
