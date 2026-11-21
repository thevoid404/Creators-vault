"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Plus, Sparkles, ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { PRIMARY_NAV, SECONDARY_NAV, isActive } from "./nav-config";
import { cn } from "@/lib/utils";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {/* "+ Add asset" Button (Exact look from the mockup: pill with violet glow) */}
      <Link
        href={"/assets/new" as Route}
        onClick={onNavigate}
        className="mb-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6d64ff] text-sm font-semibold text-white shadow-lg shadow-[#6d64ff]/25 transition-all hover:bg-[#5b51ff] hover:shadow-xl hover:shadow-[#6d64ff]/35"
      >
        <Plus className="size-4 stroke-[2.5]" />
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
              "group relative flex h-10 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-all duration-150",
              active
                ? "bg-[#181f33] text-white shadow-sm font-semibold border border-white/10 dark:bg-[#181f33]"
                : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl bg-[#181f33] border border-white/10"
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            )}
            <item.icon className={cn("relative size-4 shrink-0", active ? "text-[#818cf8]" : "text-muted-foreground")} />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}

      <div className="my-4 h-px bg-border" />

      {SECONDARY_NAV.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors",
              active
                ? "bg-[#181f33] text-white font-semibold border border-white/10"
                : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0 text-muted-foreground" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-border bg-surface dark:bg-[#0d111c] lg:flex">
      <div>
        <div className="flex h-18 items-center px-6">
          <Wordmark />
        </div>
        <NavLinks />
      </div>

      {/* Upgrade to Pro Card (Exact card from the bottom of the mockup) */}
      <div className="p-3 pb-5">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#181d2f] to-[#111524] p-4 text-white shadow-lg">
          {/* Top spark star */}
          <div className="flex size-8 items-center justify-center rounded-xl bg-[#6d64ff]/20 text-[#a5b4fc]">
            <Sparkles className="size-4" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-white">Upgrade to Pro</h4>
          <p className="mt-1 text-xs text-slate-400">
            Unlock more power for your workflow.
          </p>
          <Link
            href={"/settings/billing" as Route}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
          >
            View Plans
            <ArrowRight className="size-3" />
          </Link>
        </div>
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
      <aside className="relative flex w-64 max-w-[80vw] flex-1 flex-col justify-between border-r border-border bg-surface dark:bg-[#0d111c] shadow-2xl">
        <div>
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
        </div>
        <div className="p-3 pb-5">
          <div className="rounded-2xl border border-white/10 bg-[#161c2e] p-4 text-white">
            <h4 className="text-sm font-bold">Upgrade to Pro</h4>
            <p className="mt-1 text-xs text-slate-400">Unlock more power for your workflow.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
