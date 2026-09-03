"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Users, X } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminListUsersQuery, SortOrder, User } from "@/lib/types";
import { useDebouncedValue, useQuery, useQueryParams } from "@/lib/hooks";
import { formatDate, formatSizeMB } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput, Select } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountStatusBadge, PlanBadge, RoleBadge, UserCell } from "@/components/shared";

const PAGE_SIZE = 25;

function UsersBrowser() {
  const router = useRouter();
  const { get, set } = useQueryParams();

  const page = Number(get("page") || "1");
  const sortBy = (get("sortBy") as AdminListUsersQuery["sortBy"]) || "createdAt";
  const sortOrder = (get("sortOrder") as SortOrder) || "desc";
  const role = get("role") || "";
  const plan = get("plan") || "";
  const statusFilter = get("status") || "";

  const [term, setTerm] = useState(get("q") ?? "");
  const debounced = useDebouncedValue(term, 350);
  useEffect(() => {
    if ((get("q") ?? "") !== debounced) set({ q: debounced || null, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const { data, loading, error, refetch } = useQuery(
    () =>
      api.admin.users({
        page,
        limit: PAGE_SIZE,
        sortBy,
        sortOrder,
        q: get("q") || undefined,
        role: (role || undefined) as AdminListUsersQuery["role"],
        plan: (plan || undefined) as AdminListUsersQuery["plan"],
        status: (statusFilter || undefined) as AdminListUsersQuery["status"],
      }),
    [page, sortBy, sortOrder, role, plan, statusFilter, get("q")],
  );

  const toggleSort = (key: string) =>
    set({
      sortBy: key,
      sortOrder: sortBy === key && sortOrder === "desc" ? "asc" : "desc",
      page: null,
    });

  const columns: Column<User>[] = [
    { key: "user", header: "User", cell: (u) => <UserCell user={u} /> },
    { key: "plan", header: "Plan", cell: (u) => <PlanBadge plan={u.plan} /> },
    { key: "role", header: "Role", cell: (u) => <RoleBadge role={u.role} /> },
    {
      key: "status",
      header: "Status",
      cell: (u) => <AccountStatusBadge suspendedAt={u.suspendedAt} />,
    },
    {
      key: "storage",
      header: "Storage",
      sortKey: "storageUsedMB",
      align: "right",
      cell: (u) => <span className="nums">{formatSizeMB(u.storageUsedMB)}</span>,
    },
    {
      key: "joined",
      header: "Joined",
      sortKey: "createdAt",
      align: "right",
      cell: (u) => <span className="nums text-muted-foreground">{formatDate(u.createdAt)}</span>,
    },
  ];

  const hasFilters = Boolean(role || plan || statusFilter || get("q"));

  return (
    <div>
      <PageHeader
        title="Users"
        description="Everyone with a Creators' Vault account. Open a row for detail and actions."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search name or email…"
          className="min-w-[14rem] flex-1 sm:max-w-xs"
        />
        <Select
          value={role}
          onChange={(e) => set({ role: e.target.value || null, page: null })}
          className="w-auto"
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </Select>
        <Select
          value={plan}
          onChange={(e) => set({ plan: e.target.value || null, page: null })}
          className="w-auto"
          aria-label="Filter by plan"
        >
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => set({ status: e.target.value || null, page: null })}
          className="w-auto"
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setTerm("");
              set({ role: null, plan: null, status: null, q: null, page: null });
            }}
            className="flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-muted-foreground hover:bg-surface-2"
          >
            <X className="size-3.5" />
            Clear
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={data?.data}
        getRowKey={(u) => u.id}
        meta={data?.meta}
        loading={loading}
        error={error}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={toggleSort}
        onPageChange={(p) => set({ page: p === 1 ? null : p })}
        onRowClick={(u) => router.push(`/users/${u.id}` as Route)}
        onRetry={refetch}
        empty={
          <EmptyState
            icon={Users}
            title={hasFilters ? "No users match those filters" : "No users yet"}
            description={hasFilters ? "Try loosening a filter." : undefined}
          />
        }
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersBrowser />
    </Suspense>
  );
}
