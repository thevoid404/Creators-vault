import {
  LayoutDashboard,
  FolderKanban,
  Boxes,
  Search,
  Tags,
  Store,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** match sub-routes too */
  prefix?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Assets", href: "/assets", icon: Boxes, prefix: true },
  { label: "Projects", href: "/projects", icon: FolderKanban, prefix: true },
  { label: "Search", href: "/search", icon: Search },
  { label: "Tags", href: "/tags", icon: Tags },
  { label: "Marketplace", href: "/marketplace", icon: Store, prefix: true },
];

export const SECONDARY_NAV: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings, prefix: true },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.prefix) return pathname === item.href || pathname.startsWith(item.href + "/");
  return pathname === item.href;
}
