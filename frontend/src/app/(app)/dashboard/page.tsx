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
  ArrowRight,
  TrendingUp,
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
    <div className="space-y-8 pb-10">
      {/* 
        Hero Banner: Modern frosted glass greeting inspired by the login design.
        Deep aura background in dark mode, crisp clean gradient in light mode.
      */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface via-surface-2 to-surface p-6 shadow-xl sm:p-8 dark:border-white/10 dark:from-[#131520] dark:via-[#171a27] dark:to-[#0f1118]">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-72 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-md dark:border-white/10 dark:bg-white/5">
              <Sparkles className="size-3.5 text-primary" />
              <span>Workspace Overview</span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {greeting()}
              {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Here&apos;s a calm, intelligent look at your creative vault today.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <ButtonLink href="/assets/new" className="h-11 rounded-xl shadow-lg shadow-primary/20">
              <Plus className="mr-1.5 size-4" />
              New Asset
            </ButtonLink>
          </div>
        </div>

        {/* Floating Natural Language Search Bar (matching the Login card search aesthetic) */}
        <form onSubmit={runSearch} className="relative z-10 mt-6 max-w-2xl">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-4 size-5 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search by meaning or keyword — e.g. “dark dashboard mockup”..."
              aria-label="Search your assets"
              className="h-13 w-full rounded-2xl border border-border bg-surface/90 pl-12 pr-28 text-sm text-foreground shadow-inner backdrop-blur-md placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5"
            />
            <button
              type="submit"
              className="absolute right-2.5 flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary-hover"
            >
              Search
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Quick Stats Grid: Glass-card aesthetic */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Assets"
          value={stats ? stats.total.toLocaleString() : "—"}
          icon={Boxes}
          tone="primary"
          loading={initialLoading}
        />
        <StatCard
          label="Organized Vault"
          value={stats ? formatPercent(stats.organizedPct) : "—"}
          hint="assigned to a project"
          icon={TrendingUp}
          tone="success"
          loading={initialLoading}
        />
        <StatCard
          label="Active Projects"
          value={stats ? stats.activeProjects : "—"}
          icon={FolderKanban}
          tone="info"
          loading={initialLoading}
        />
        <StatCard
          label="Needs Attention"
          value={stats ? stats.needsAttention.length : "—"}
          hint="missing tags or project"
          icon={TriangleAlert}
          tone="warning"
          loading={initialLoading}
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-danger-soft bg-danger-soft/40 px-5 py-4 text-sm text-danger-soft-foreground backdrop-blur-md">
          Couldn&apos;t load your dashboard.{" "}
          <button onClick={refetch} className="font-semibold underline hover:text-danger">
            Retry
          </button>
        </div>
      ) : null}

      {/* Dual column: Recently added & Needs attention */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recently added */}
        <Section
          title="Recently Added"
          description="Latest creations & uploads"
          viewAllHref="/assets?sortBy=createdAt"
          className="rounded-3xl border-border bg-surface/70 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#141620]/80"
        >
          {initialLoading ? (
            <SkeletonRows />
          ) : data && data.recent.data.length > 0 ? (
            <div className="space-y-1">
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
          title="Needs Attention"
          description="Recent items missing a project, tags or description"
          viewAllHref="/assets"
          className="rounded-3xl border-border bg-surface/70 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#141620]/80"
        >
          {initialLoading ? (
            <SkeletonRows />
          ) : stats && stats.needsAttention.length > 0 ? (
            <div className="space-y-1">
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

      {/* Projects Showcase */}
      <Section
        title="Featured Projects"
        description="Active workspaces and collections"
        viewAllHref="/projects"
        className="rounded-3xl border-border bg-surface/70 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#141620]/80"
      >
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
            action={
              <ButtonLink href="/projects" variant="secondary">
                Create a project
              </ButtonLink>
            }
          />
        )}
      </Section>

      {/* Recently used */}
      <Section
        title="Recently Used"
        description="Assets you touched most recently"
        viewAllHref="/assets?sortBy=updatedAt"
        className="rounded-3xl border-border bg-surface/70 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-[#141620]/80"
      >
        {initialLoading ? (
          <SkeletonRows />
        ) : data && data.updated.data.length > 0 ? (
          <motion.div layout className="grid gap-2 sm:grid-cols-2">
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
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <div className="size-10 animate-pulse rounded-xl bg-surface-3" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-surface-3" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-3" />
          </div>
        </div>
      ))}
    </div>
  );
}
