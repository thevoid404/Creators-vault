import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/types";
import { initials } from "@/lib/utils";

/** Compact user identity cell for tables. */
export function UserCell({ user }: { user: Pick<User, "name" | "email" | "avatarUrl"> }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-[11px] font-bold text-primary-soft-foreground">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="size-7 object-cover" />
        ) : (
          initials(user.name, user.email)
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{user.name ?? "—"}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
}

export function RoleBadge({ role }: { role: "user" | "admin" }) {
  return role === "admin" ? (
    <Badge tone="primary">Admin</Badge>
  ) : (
    <Badge tone="neutral">User</Badge>
  );
}

export function AccountStatusBadge({ suspendedAt }: { suspendedAt: string | null }) {
  return suspendedAt ? (
    <Badge tone="danger">Suspended</Badge>
  ) : (
    <Badge tone="success">Active</Badge>
  );
}

export function PlanBadge({ plan }: { plan: "free" | "pro" }) {
  return plan === "pro" ? (
    <Badge tone="info">Pro</Badge>
  ) : (
    <Badge tone="neutral">Free</Badge>
  );
}

/** Small monospace id chip. */
export function IdChip({ id }: { id: string }) {
  return (
    <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
      {id.slice(0, 8)}
    </span>
  );
}
