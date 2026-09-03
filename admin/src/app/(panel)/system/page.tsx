"use client";

import { Activity, CreditCard, Database } from "lucide-react";
import { api } from "@/lib/api";
import type { ModuleStatus } from "@/lib/types";
import { useQuery } from "@/lib/hooks";
import { formatRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const STATUS_META: Record<ModuleStatus["status"], { tone: BadgeTone; label: string }> = {
  live: { tone: "success", label: "Live" },
  stub: { tone: "warning", label: "Stub" },
  "backend-only": { tone: "info", label: "Backend only" },
};

export default function SystemStatusPage() {
  const { data, initialLoading, error, refetch } = useQuery(
    () => api.admin.systemStatus(),
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="System status"
        description={
          data
            ? `Which backend modules are live vs. intentionally stubbed. Checked ${formatRelativeTime(
                data.generatedAt,
              )}.`
            : "Which backend modules are live vs. intentionally stubbed."
        }
      />

      {error && (
        <ErrorState title="Couldn't reach the backend" description={error.message} onRetry={refetch} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardBody className="flex items-start gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground">
              <Database className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Database</p>
              {initialLoading ? (
                <Skeleton className="mt-1 h-4 w-32" />
              ) : data ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {data.health.database === "up" ? (
                    <Badge tone="success">Connected</Badge>
                  ) : (
                    <Badge tone="danger">Unreachable</Badge>
                  )}{" "}
                  <span className="ml-1">pgvector: {data.health.pgvector}</span>
                </p>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex items-start gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground">
              <CreditCard className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Payments</p>
              {initialLoading ? (
                <Skeleton className="mt-1 h-4 w-40" />
              ) : data ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Provider <span className="font-mono">{data.payments.provider}</span> ·{" "}
                  {data.payments.isLive ? (
                    <Badge tone="success">Live</Badge>
                  ) : (
                    <Badge tone="warning">Mock — no money moves</Badge>
                  )}
                </p>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="size-3.5" />
            from the backend
          </span>
        </CardHeader>
        <CardBody className="p-0">
          {initialLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data?.modules.map((m) => (
                <li key={m.key} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-40 shrink-0">
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    <p className="text-xs text-subtle-foreground">
                      {m.endpoints} endpoint{m.endpoints === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge tone={STATUS_META[m.status].tone} className="mt-0.5 shrink-0">
                    {STATUS_META[m.status].label}
                  </Badge>
                  <p className="min-w-0 flex-1 text-sm text-muted-foreground">{m.note}</p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <p className="text-xs text-subtle-foreground">
        This list is maintained in the backend (
        <span className="font-mono">src/admin/system-modules.ts</span>), alongside{" "}
        <span className="font-mono">api.md</span> and <span className="font-mono">todo.md</span>,
        so it stays accurate as the backend evolves.
      </p>
    </div>
  );
}
