"use client";

import Link from "next/link";
import type { Route } from "next";
import { motion } from "motion/react";
import { Archive, Boxes, FolderKanban } from "lucide-react";
import type { Project } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

export function ProjectCard({ project }: { project: Project }) {
  const accent = project.color || "var(--color-primary)";
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Link
        href={`/projects/${project.id}` as Route}
        className="block overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border-strong"
      >
        <div
          className="relative h-20 w-full"
          style={{
            background: project.coverUrl
              ? undefined
              : `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 55%, transparent))`,
          }}
        >
          {project.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.coverUrl}
              alt=""
              className="size-full object-cover"
            />
          )}
          {project.archivedAt && (
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-surface/85 px-1.5 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Archive className="size-3" />
              Archived
            </span>
          )}
        </div>
        <div className="p-3.5">
          <div className="flex items-center gap-2">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-white"
              style={{ background: accent }}
            >
              <FolderKanban className="size-3.5" />
            </span>
            <p className="line-clamp-1 text-sm font-semibold text-foreground">
              {project.name}
            </p>
          </div>
          {project.description && (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {project.description}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-xs text-subtle-foreground">
            <span className="inline-flex items-center gap-1">
              <Boxes className="size-3.5" />
              {project.assetCount} {project.assetCount === 1 ? "asset" : "assets"}
            </span>
            <span>{formatRelativeTime(project.updatedAt)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="h-20 w-full animate-pulse bg-surface-3" />
      <div className="space-y-2 p-3.5">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-3" />
        <div className="h-3 w-full animate-pulse rounded bg-surface-3" />
      </div>
    </div>
  );
}

export function ProjectGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {children}
    </div>
  );
}
