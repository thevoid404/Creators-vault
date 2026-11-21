"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from "./nav-config";
import { cn } from "@/lib/utils";
import { StorageMeter } from "./storage-meter";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      <Link
        href={"/assets/new" as Route}
        onClick={onNavigate}
        className="mb-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:bg-primary-hover hover:shadow-md hover:shadow-primary/30"
      >
        <Plus className="size-4" />
        Add asset
      </Link>

      {PRIMARY_NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-9 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-150",
              active
                ? "bg-surface-2 text-foreground shadow-sm font-semibold border border-border"
                : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl bg-surface-2 border border-border"
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            )}
            <item.icon className="relative size-4 shrink-0" />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}

      <div className="my-3 h-px bg-border" />

      {SECONDARY_NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
              active
                ? "bg-surface-2 text-foreground font-semibold border border-border"
                : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface/50 backdrop-blur-md lg:flex lg:flex-col">
      <div className="flex h-16 items-center px-6">
        <Wordmark />
      </div>
      <NavLinks />
      <div className="p-3">
        <StorageMeter />
      </div>
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <div
        className="fixed inset-0 bg-overlay backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative flex w-64 max-w-[80vw] flex-1 flex-col border-r border-border bg-surface shadow-2xl">
        <div className="flex h-16 items-center justify-between px-6">
          <Wordmark />
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2"
          >
            <span className="sr-only">Close sidebar</span>
            ✕
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
        <div className="p-3">
          <StorageMeter />
        </div>
      </aside>
    </div>
  );
}
