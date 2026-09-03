"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Boxes,
  CircleCheck,
  FolderKanban,
  Receipt,
  ShieldMinus,
  ShieldPlus,
  Tags,
} from "lucide-react";
import { api } from "@/lib/api";
import type { AdminUserDetail } from "@/lib/types";
import { useMutation, useQuery } from "@/lib/hooks";
import { useToast } from "@/providers/toast-provider";
import {
  ASSET_TYPE_LABELS,
  errorMessage,
  formatDateTime,
  formatNumber,
  formatSizeMB,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AccountStatusBadge,
  IdChip,
  PlanBadge,
  RoleBadge,
  UserCell,
} from "@/components/shared";

type Action = "promote" | "demote" | "suspend" | "reactivate";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const toast = useToast();
  const [action, setAction] = useState<Action | null>(null);

  const { data, loading, error, refetch } = useQuery<AdminUserDetail>(
    () => api.admin.user(id),
    [id],
  );

  const roleMut = useMutation((role: "user" | "admin") => api.admin.updateUser(id, { role }));
  const suspendMut = useMutation(() => api.admin.suspendUser(id));
  const reactivateMut = useMutation(() => api.admin.reactivateUser(id));

  const busy = roleMut.loading || suspendMut.loading || reactivateMut.loading;

  async function run() {
    if (!action) return;
    try {
      if (action === "promote") {
        await roleMut.mutate("admin");
        toast.success("Role updated", "This user is now an admin.");
      } else if (action === "demote") {
        await roleMut.mutate("user");
        toast.success("Role updated", "Admin access removed.");
      } else if (action === "suspend") {
        const r = await suspendMut.mutate();
        toast.success("Account suspended", r.message);
      } else if (action === "reactivate") {
        const r = await reactivateMut.mutate();
        toast.success("Account reactivated", r.message);
      }
      setAction(null);
      refetch();
    } catch (err) {
      toast.error("Action failed", errorMessage(err));
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }
  if (error || !data) {
    return (
      <ErrorState
        title="Couldn't load this user"
        description={error?.message}
        onRetry={refetch}
      />
    );
  }

  const u = data.user;

  const confirmCopy: Record<Action, { title: string; description: string; label: string; danger?: boolean }> = {
    promote: {
      title: `Make ${u.name ?? u.email} an admin?`,
      description:
        "They will get full access to this admin panel, including the ability to change roles and suspend accounts.",
      label: "Promote to admin",
    },
    demote: {
      title: `Remove admin access from ${u.name ?? u.email}?`,
      description: "They lose access to this panel immediately on their next request.",
      label: "Demote to user",
      danger: true,
    },
    suspend: {
      title: `Suspend ${u.name ?? u.email}?`,
      description:
        "They cannot sign in or use the API. Existing sessions stop working on the next request. Reversible.",
      label: "Suspend account",
      danger: true,
    },
    reactivate: {
      title: `Reactivate ${u.name ?? u.email}?`,
      description: "They will be able to sign in again. They must start a fresh session.",
      label: "Reactivate account",
    },
  };

  return (
    <div className="space-y-5">
      <Link
        href={"/users" as Route}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All users
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <UserCell user={u} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RoleBadge role={u.role} />
            <PlanBadge plan={u.plan} />
            <AccountStatusBadge suspendedAt={u.suspendedAt} />
            <Badge tone="neutral">via {u.authProvider}</Badge>
            <IdChip id={u.id} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Joined {formatDateTime(u.createdAt)}
            {u.suspendedAt && ` · suspended ${formatDateTime(u.suspendedAt)}`}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          {u.role === "admin" ? (
            <Button variant="outline" size="sm" onClick={() => setAction("demote")} disabled={busy}>
              <ShieldMinus className="size-4" />
              Demote to user
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAction("promote")} disabled={busy}>
              <ShieldPlus className="size-4" />
              Make admin
            </Button>
          )}
          {u.suspendedAt ? (
            <Button variant="secondary" size="sm" onClick={() => setAction("reactivate")} disabled={busy}>
              <CircleCheck className="size-4" />
              Reactivate
            </Button>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setAction("suspend")} disabled={busy}>
              <Ban className="size-4" />
              Suspend
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat icon={Boxes} label="Assets" value={formatNumber(data.assetCount)} sub={`${data.hiddenAssetCount} hidden`} />
        <MiniStat icon={FolderKanban} label="Projects" value={formatNumber(data.projectCount)} />
        <MiniStat icon={Tags} label="Tags" value={formatNumber(data.tagCount)} />
        <MiniStat icon={Receipt} label="Transactions" value={formatNumber(data.transactionCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent assets</CardTitle>
          <Link
            href={`/assets?ownerId=${u.id}` as Route}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all in Assets
          </Link>
        </CardHeader>
        <CardBody className="p-0">
          {data.recentAssets.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              This user has no assets.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentAssets.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/assets/${a.id}` as Route}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-2">
                      {a.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.previewUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <Boxes className="size-4 text-subtle-foreground" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ASSET_TYPE_LABELS[a.type]} · {formatSizeMB(a.fileSizeMB)}
                        {a.deletedAt && " · hidden"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {action && (
        <ConfirmDialog
          open
          onClose={() => setAction(null)}
          onConfirm={run}
          loading={busy}
          title={confirmCopy[action].title}
          description={confirmCopy[action].description}
          confirmLabel={confirmCopy[action].label}
          danger={confirmCopy[action].danger}
        />
      )}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="nums mt-1.5 text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-subtle-foreground">{sub}</p>}
    </div>
  );
}
