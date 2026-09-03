"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  Boxes,
  FileStack,
  FolderKanban,
  HardDrive,
  Receipt,
  Store,
  UserPlus,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ActivityItem } from "@/lib/types";
import { useQuery } from "@/lib/hooks";
import { formatNumber, formatRelativeTime, formatSizeMB } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/empty-state";
import { StubNotice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";

const ACTIVITY_ICON: Record<ActivityItem["type"], typeof UserPlus> = {
  user_signup: UserPlus,
  asset_upload: FileStack,
  listing_created: Store,
};

export default function OverviewPage() {
  const { data, initialLoading, error, refetch } = useQuery(() => api.admin.stats(), []);
  const c = data?.counts;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform overview"
        description={
          data
            ? `A snapshot of the whole platform, generated ${formatRelativeTime(data.generatedAt)}.`
            : "A snapshot of the whole platform."
        }
      />

      {error && (
        <ErrorState
          description={error.message}
          onRetry={refetch}
          title="Couldn't load platform stats"
        />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Users" value={c ? formatNumber(c.users) : "—"} icon={Users} tone="primary" loading={initialLoading} hint={c ? `${c.admins} admin · ${c.suspendedUsers} suspended` : undefined} />
        <StatCard label="Assets" value={c ? formatNumber(c.assets) : "—"} icon={Boxes} tone="info" loading={initialLoading} hint={c ? `${formatNumber(c.hiddenAssets)} hidden` : undefined} />
        <StatCard label="Projects" value={c ? formatNumber(c.projects) : "—"} icon={FolderKanban} tone="success" loading={initialLoading} />
        <StatCard label="Storage used" value={c ? formatSizeMB(c.storageUsedMB) : "—"} icon={HardDrive} tone="warning" loading={initialLoading} hint="across all users" />
        <StatCard label="Active listings" value={c ? formatNumber(c.activeListings) : "—"} icon={Store} tone="primary" loading={initialLoading} hint="sample data" />
        <StatCard label="Transactions" value={c ? formatNumber(c.transactions) : "—"} icon={Receipt} tone="info" loading={initialLoading} hint="mock provider" />
      </div>

      {data && (data.marketplaceIsStub || !data.paymentsIsLive) && (
        <StubNotice>
          <span className="font-semibold">Marketplace and payments are backend stubs.</span>{" "}
          The <em>Active listings</em> figure counts sample listings, and every transaction ran
          through <span className="font-mono">MockPaymentProvider</span> — no money moved. See{" "}
          <Link href={"/system" as Route} className="font-semibold underline">
            System status
          </Link>
          .
        </StubNotice>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <span className="text-xs text-muted-foreground">newest first</span>
        </CardHeader>
        <CardBody className="p-0">
          {initialLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <Skeleton className="h-3.5 flex-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : data && data.recentActivity.length > 0 ? (
            <ul className="divide-y divide-border">
              {data.recentActivity.map((item) => {
                const Icon = ACTIVITY_ICON[item.type];
                return (
                  <li key={`${item.type}-${item.id}`} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm text-foreground">{item.label}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(item.at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No recent activity.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
