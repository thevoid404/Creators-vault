"use client";

import { useState } from "react";
import { Check, Copy, Plus, Puzzle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { ExtensionToken } from "@/lib/types";
import { useQuery } from "@/lib/hooks";
import { useToast } from "@/providers/toast-provider";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingRow } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ExtensionSettingsPage() {
  const toast = useToast();
  const { data, loading, refetch } = useQuery<ExtensionToken[]>(
    () => api.extension.listTokens(),
    [],
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("365");
  const [creating, setCreating] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ExtensionToken | null>(null);
  const [revoking, setRevoking] = useState(false);

  async function create() {
    if (!name.trim()) {
      toast.error("Name the token so you can tell it apart later");
      return;
    }
    setCreating(true);
    try {
      const token = await api.extension.createToken({
        name: name.trim(),
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      });
      setFreshToken(token.token ?? null);
      setCreateOpen(false);
      setName("");
      refetch();
    } catch (err) {
      toast.error(
        "Couldn't create the token",
        err instanceof ApiError ? err.messages.join(" ") : "Try again.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function revoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await api.extension.revokeToken(revokeTarget.id);
      toast.success("Token revoked");
      setRevokeTarget(null);
      refetch();
    } catch {
      toast.error("Couldn't revoke that token");
    } finally {
      setRevoking(false);
    }
  }

  function copy() {
    if (!freshToken) return;
    navigator.clipboard?.writeText(freshToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Browser extension tokens</h2>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              A long-lived token lets the (separate) browser extension capture pages into your
              vault without signing in each time. Create one, paste it into the extension.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New token
          </Button>
        </div>
      </section>

      {loading && !data ? (
        <LoadingRow />
      ) : data && data.length === 0 ? (
        <EmptyState
          icon={Puzzle}
          title="No tokens yet"
          description="Create a token when you're ready to set up the extension."
        />
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {data?.map((token) => {
            const revoked = Boolean(token.revokedAt);
            const expired =
              token.expiresAt && new Date(token.expiresAt).getTime() < Date.now();
            return (
              <div key={token.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {token.name}
                    </p>
                    {revoked ? (
                      <Badge tone="danger">Revoked</Badge>
                    ) : expired ? (
                      <Badge tone="warning">Expired</Badge>
                    ) : (
                      <Badge tone="success">Active</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-subtle-foreground">
                    {token.tokenPrefix}…
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {token.lastUsedAt
                      ? `Last used ${formatRelativeTime(token.lastUsedAt)}`
                      : "Never used"}
                    {token.expiresAt && ` · Expires ${formatDate(token.expiresAt)}`}
                  </p>
                </div>
                {!revoked && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRevokeTarget(token)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New extension token"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={create} loading={creating}>
              Create token
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required hint="e.g. “Chrome on my laptop”">
            {({ id }) => (
              <Input
                id={id}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={80}
              />
            )}
          </Field>
          <Field label="Expires in">
            {({ id }) => (
              <Select
                id={id}
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              >
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="730">2 years</option>
              </Select>
            )}
          </Field>
        </div>
      </Dialog>

      {/* One-time token reveal */}
      <Dialog
        open={Boolean(freshToken)}
        onClose={() => setFreshToken(null)}
        title="Copy your token now"
        description="This is the only time it's shown. If you lose it, revoke it and make a new one."
        footer={
          <Button onClick={() => setFreshToken(null)}>Done</Button>
        }
      >
        <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-3">
          <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
            {freshToken}
          </code>
          <Button size="sm" variant="secondary" onClick={copy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={revoke}
        title={`Revoke “${revokeTarget?.name}”?`}
        description="The extension using this token will stop working immediately."
        confirmLabel="Revoke token"
        danger
        loading={revoking}
      />
    </div>
  );
}
