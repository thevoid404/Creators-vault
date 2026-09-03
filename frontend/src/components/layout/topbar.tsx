"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { LogOut, Menu, Monitor, Moon, Search, Settings, Sun, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/providers/theme-provider";
import { Menu as DropMenu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { cn } from "@/lib/utils";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const router = useRouter();
  const { user, logout, logoutEverywhere } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [q, setQ] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}` as Route);
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <form onSubmit={submitSearch} className="relative flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search assets…"
          aria-label="Search assets"
          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:outline-1 focus-visible:outline-primary"
        />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>

        <DropMenu
          align="end"
          trigger={
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-soft-foreground",
                "cursor-pointer ring-offset-2 ring-offset-background transition-shadow hover:ring-2 hover:ring-border-strong",
              )}
              title={user?.name}
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="size-9 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </span>
          }
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <MenuSeparator />
          <MenuItem icon={<Settings />} onClick={() => router.push("/settings" as Route)}>
            Settings
          </MenuItem>
          <MenuItem
            icon={<Monitor />}
            onClick={() => router.push("/settings/extension" as Route)}
          >
            Browser extension
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<LogOut />} onClick={() => logout()}>
            Sign out
          </MenuItem>
          <MenuItem icon={<Users />} danger onClick={() => logoutEverywhere()}>
            Sign out everywhere
          </MenuItem>
        </DropMenu>
      </div>
    </header>
  );
}
