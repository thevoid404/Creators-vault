"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import Link from "next/link";
import {
  Image as ImageIcon,
  TrendingUp,
  FolderKanban,
  TriangleAlert,
  Search,
  Sparkles,
  Plus,
  ArrowRight,
  Clock,
  Rocket,
  CheckCircle2,
  HardDrive,
  MoreHorizontal,
  Play,
  FileText,
  Code2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/hooks";
import { formatPercent, formatRelativeTime, formatSizeMB } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";
import { ButtonLink } from "@/components/ui/button";
import { AssetPreview } from "@/components/assets/asset-preview";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [term, setTerm] = useState("");

  const { data, initialLoading } = useQuery(async () => {
    const [totalRes, recent, projects, scan] = await Promise.all([
      api.assets.list({ limit: 1 }),
      api.assets.list({ limit: 4, sortBy: "createdAt", sortOrder: "desc" }),
      api.projects.list({ limit: 6, sortBy: "updatedAt", sortOrder: "desc" }),
      api.assets.list({ limit: 60, sortBy: "updatedAt", sortOrder: "desc" }),
    ]);
    return { totalRes, recent, projects, scan };
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const total = data.totalRes.meta.total;
    const organized = data.projects.data.reduce((sum, p) => sum + p.assetCount, 0);
    const needsAttention = data.scan.data.filter(
      (a) => a.embeddingStatus === "failed" || !a.project || a.tags.length === 0,
    );
    return {
      total,
      organizedPct: total > 0 ? (organized / total) * 100 : 0,
      activeProjects: data.projects.meta.total,
      needsAttentionCount: needsAttention.length,
    };
  }, [data]);

  function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = term.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}` as Route);
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ============================================================== */}
      {/* 1. HERO BANNER WITH FLOATING 3D CARDS (Exact match to mockup)   */}
      {/* ============================================================== */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#111728] via-[#151c33] to-[#121626] p-7 shadow-xl lg:p-9">
        {/* Soft Violet/Blue Ambient Backlight */}
        <div className="pointer-events-none absolute right-10 top-0 size-96 rounded-full bg-[#6d64ff]/20 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          {/* Left Text & Search */}
          <div className="max-w-xl">
            {/* Tag pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6d64ff]/30 bg-[#6d64ff]/10 px-3 py-1 text-xs font-semibold text-[#a5b4fc]">
              <Sparkles className="size-3.5" />
              <span>Workspace Overview</span>
            </div>

            {/* Greeting */}
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {greeting()},{" "}
              <span className="text-[#a5b4fc]">{user?.name ? user.name.split(" ")[0].toLowerCase() : "creator"}</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Here&apos;s a calm, intelligent look at your creative vault today.
            </p>

            {/* Inset Search Bar */}
            <form onSubmit={runSearch} className="mt-6 flex max-w-lg items-center">
              <div className="relative flex w-full items-center">
                <Search className="pointer-events-none absolute left-4 size-4 text-slate-400" />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search by name, type, or tag..."
                  aria-label="Search assets"
                  className="h-11 w-full rounded-2xl border border-white/10 bg-[#0d1220]/90 pl-11 pr-24 text-sm text-white placeholder:text-slate-500 focus:border-[#6d64ff] focus:outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 flex h-8 items-center gap-1 rounded-xl bg-[#6d64ff] px-3.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-[#5b51ff]"
                >
                  Search
                  <ArrowRight className="size-3" />
                </button>
              </div>
            </form>
          </div>

          {/* Right Action Button & Floating 3D Artwork Tiles */}
          <div className="flex flex-col items-start gap-4 lg:items-end">
            <ButtonLink
              href="/assets/new"
              className="h-10 rounded-xl bg-[#6d64ff] px-4 font-semibold text-white shadow-lg shadow-[#6d64ff]/30 hover:bg-[#5b51ff]"
            >
              <Plus className="mr-1.5 size-4 stroke-[2.5]" />
              New Asset
            </ButtonLink>

            {/* 3D Tilted Cards Graphic (Right of the banner) */}
            <div className="relative mt-2 hidden h-28 w-64 items-center justify-center lg:flex">
              {/* Card 1: Image Mockup with white border */}
              <div className="absolute -left-2 top-2 z-20 h-20 w-32 -rotate-6 overflow-hidden rounded-xl border-2 border-white/80 bg-slate-800 shadow-2xl transition-transform hover:rotate-0">
                <div className="flex size-full items-center justify-center bg-gradient-to-tr from-sky-600 to-indigo-500 text-white">
                  <ImageIcon className="size-8 opacity-80" />
                </div>
              </div>

              {/* Card 2: Video Player Tile */}
              <div className="absolute left-20 top-0 z-10 flex h-20 w-24 rotate-6 items-center justify-center rounded-xl border border-white/20 bg-[#161c2e] shadow-xl">
                <Play className="size-6 fill-white text-white opacity-80" />
              </div>

              {/* Card 3: Code Tile */}
              <div className="absolute right-0 top-3 z-0 flex h-18 w-20 rotate-12 items-center justify-center rounded-xl border border-white/10 bg-[#101422] text-[#818cf8] shadow-lg">
                <Code2 className="size-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. STATS GRID WITH VECTOR SPARKLINE CURVES (Exact match)       */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Assets"
          value={stats ? stats.total.toLocaleString() : "248"}
          trend="↑ 12%"
          icon={ImageIcon}
          tone="primary"
          loading={initialLoading}
        />
        <StatCard
          label="Organized Vault"
          value={stats ? formatPercent(stats.organizedPct) : "92%"}
          trend="↑ 2%"
          icon={TrendingUp}
          tone="success"
          loading={initialLoading}
        />
        <StatCard
          label="Active Projects"
          value={stats ? stats.activeProjects : "12"}
          trend="↑ 1 new"
          icon={FolderKanban}
          tone="info"
          loading={initialLoading}
        />
        <StatCard
          label="Needs Attention"
          value={stats ? stats.needsAttentionCount : "3"}
          hint="missing tags or project"
          icon={TriangleAlert}
          tone="warning"
          loading={initialLoading}
        />
      </div>

      {/* ============================================================== */}
      {/* 3. DUAL SECTIONS: RECENTLY ADDED + NEEDS ATTENTION CARDS       */}
      {/* ============================================================== */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Recently Added Card Grid (Left - 7 Cols) */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-[#101522] p-6 shadow-xl lg:col-span-7">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-[#6d64ff]/15 text-[#818cf8]">
                  <Clock className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Recently Added</h3>
                  <p className="text-xs text-slate-400">Your latest assets are here.</p>
                </div>
              </div>
              <Link
                href={"/assets?sortBy=createdAt" as Route}
                className="flex items-center gap-1 text-xs font-semibold text-[#818cf8] hover:text-[#a5b4fc]"
              >
                View all
                <ArrowRight className="size-3" />
              </Link>
            </div>

            {/* Asset Preview Cards (Thumbnails with metadata below) */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data && data.recent.data.length > 0
                ? data.recent.data.map((asset) => (
                    <Link
                      key={asset.id}
                      href={`/assets/${asset.id}` as Route}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#141a2b] p-2 transition-all hover:border-white/20 hover:bg-[#182035]"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-900">
                        <AssetPreview asset={asset} className="size-full object-cover" />
                      </div>
                      <div className="mt-2.5 px-1">
                        <div className="flex items-center justify-between">
                          <p className="line-clamp-1 text-xs font-bold text-white group-hover:text-[#a5b4fc]">
                            {asset.title}
                          </p>
                          <MoreHorizontal className="size-3.5 text-slate-500" />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatSizeMB(asset.fileSizeMB)} · {formatRelativeTime(asset.createdAt)}
                        </p>
                      </div>
                    </Link>
                  ))
                : [
                    { title: "Nature Landscape.jpg", size: "2.4 MB", time: "2h ago" },
                    { title: "Product Demo.mp4", size: "6.7 MB", time: "4h ago" },
                    { title: "Project Proposal.pdf", size: "1.2 MB", time: "5h ago" },
                    { title: "UI Kit.fig", size: "3.1 MB", time: "1d ago" },
                  ].map((dummy, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#141a2b] p-2"
                    >
                      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-gradient-to-tr from-[#1b2238] to-[#252f4c] text-slate-400">
                        {idx === 0 ? <ImageIcon className="size-6" /> : idx === 1 ? <Play className="size-6" /> : <FileText className="size-6" />}
                      </div>
                      <div className="mt-2 px-1">
                        <div className="flex items-center justify-between">
                          <p className="line-clamp-1 text-xs font-bold text-white">{dummy.title}</p>
                          <MoreHorizontal className="size-3 text-slate-500" />
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {dummy.size} · {dummy.time}
                        </p>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* Needs Attention Task List (Right - 5 Cols, matching the mockup notifications) */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-[#101522] p-6 shadow-xl lg:col-span-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-[#6d64ff]/15 text-[#818cf8]">
                  <Rocket className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Needs Attention</h3>
                  <p className="text-xs text-slate-400">Recent items missing a project or tags</p>
                </div>
              </div>
              <Link
                href={"/assets" as Route}
                className="flex items-center gap-1 text-xs font-semibold text-[#818cf8] hover:text-[#a5b4fc]"
              >
                View all
                <ArrowRight className="size-3" />
              </Link>
            </div>

            {/* List Rows */}
            <div className="mt-5 flex flex-col gap-3">
              {/* Task Row 1: Attention Item */}
              <div className="flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                    <TriangleAlert className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {stats?.needsAttentionCount ?? 3} assets need review
                    </p>
                    <p className="text-[11px] text-slate-400">Check before publishing</p>
                  </div>
                </div>
                <Link
                  href={"/assets" as Route}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                >
                  Review →
                </Link>
              </div>

              {/* Task Row 2: Success Notice */}
              <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Project &ldquo;Brand Vault&rdquo; is all set!
                    </p>
                    <p className="text-[11px] text-slate-400">Good job!</p>
                  </div>
                </div>
              </div>

              {/* Task Row 3: Storage Notice */}
              <div className="flex items-center justify-between rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                    <HardDrive className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Storage is healthy</p>
                    <p className="text-[11px] text-slate-400">Under 2 GB allocated</p>
                  </div>
                </div>
                <Link
                  href={"/settings/billing" as Route}
                  className="rounded-xl bg-[#6d64ff] px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#5b51ff]"
                >
                  Upgrade →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
