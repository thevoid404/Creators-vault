"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Plus, X } from "lucide-react";
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
        className="mb-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary-hover"
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
              "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-lg bg-surface-2"
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
              "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-surface-2 text-foreground"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href={"/dashboard" as Route}>
          <Wordmark />
        </Link>
      </div>
      <NavLinks />
      <div className="p-3">
        <StorageMeter />
      </div>
    </aside>
  );
}

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        exit={{ x: -280 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative flex h-full w-64 flex-col border-r border-border bg-surface"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Wordmark />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2"
          >
            <X className="size-5" />
          </button>
        </div>
        <NavLinks onNavigate={onClose} />
        <div className="p-3">
          <StorageMeter />
        </div>
      </motion.aside>
    </div>
  );
}
