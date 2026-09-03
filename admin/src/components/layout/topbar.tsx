"use client";

import { LogOut, Menu as MenuIcon, Moon, ShieldUser, Sun, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/providers/theme-provider";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { initials } from "@/lib/utils";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, logout, logoutEverywhere } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 lg:hidden"
      >
        <MenuIcon className="size-5" />
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
        </button>

        <Menu
          align="end"
          trigger={
            <span
              className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-soft-foreground"
              title={user?.name ?? user?.email}
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
              ) : (
                initials(user?.name, user?.email)
              )}
            </span>
          }
        >
          <div className="px-2.5 py-2">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
              <ShieldUser className="size-3.5 text-primary" />
              {user?.name ?? "Admin"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <MenuSeparator />
          <MenuItem icon={<LogOut />} onClick={() => logout()}>
            Sign out
          </MenuItem>
          <MenuItem icon={<Users />} danger onClick={() => logoutEverywhere()}>
            Sign out everywhere
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
}
