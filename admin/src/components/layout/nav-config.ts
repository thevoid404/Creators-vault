import {
  LayoutDashboard,
  Users,
  Boxes,
  Store,
  Receipt,
  ServerCog,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  prefix?: boolean;
}

export const NAV: NavItem[] = [
  { label: "Overview", href: "/overview", icon: LayoutDashboard },
  { label: "Users", href: "/users", icon: Users, prefix: true },
  { label: "Assets", href: "/assets", icon: Boxes, prefix: true },
  { label: "Marketplace", href: "/marketplace", icon: Store, prefix: true },
  { label: "Transactions", href: "/transactions", icon: Receipt },
  { label: "System status", href: "/system", icon: ServerCog },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.prefix) return pathname === item.href || pathname.startsWith(item.href + "/");
  return pathname === item.href;
}
