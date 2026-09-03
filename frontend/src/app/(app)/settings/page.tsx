"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/providers/toast-provider";
import { formatSizeMB, titleCase } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { KeyValueList } from "@/components/ui/key-value";

export default function ProfileSettingsPage() {
  const { user, refreshUser, logoutEverywhere } = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatarUrl(user.avatarUrl ?? "");
    }
  }, [user]);

  if (!user) return null;

  const dirty = name !== user.name || avatarUrl !== (user.avatarUrl ?? "");
  const pct = Math.min(100, Math.round((user.storageUsedMB / user.storageQuotaMB) * 100));

  async function save() {
    if (!name.trim()) {
      toast.error("Name can't be empty");
      return;
    }
    setSaving(true);
    try {
      await api.users.updateMe({
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
      });
      await refreshUser();
      toast.success("Profile saved");
    } catch (err) {
      toast.error(
        "Couldn't save",
        err instanceof ApiError ? err.messages.join(" ") : "Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        <div className="mt-4 space-y-4">
          <Field label="Name" required>
            {({ id }) => (
              <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            )}
          </Field>
          <Field label="Avatar URL" hint="An absolute image URL">
            {({ id }) => (
              <Input
                id={id}
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
              />
            )}
          </Field>
          <Button onClick={save} loading={saving} disabled={!dirty} size="sm">
            Save changes
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Account</h2>
        <div className="mt-2">
          <KeyValueList
            items={[
              { label: "Email", value: user.email },
              { label: "Signed in with", value: titleCase(user.authProvider) },
              {
                label: "Plan",
                value: (
                  <span className="flex items-center gap-2">
                    <Badge tone={user.plan === "pro" ? "primary" : "neutral"}>
                      {titleCase(user.plan)}
                    </Badge>
                    <span className="text-xs text-subtle-foreground">
                      Billing isn&apos;t live yet
                    </span>
                  </span>
                ),
              },
              {
                label: "Storage",
                value: (
                  <div>
                    <div className="mb-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatSizeMB(user.storageUsedMB)} of {formatSizeMB(user.storageQuotaMB)}
                    </span>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </section>

      <section className="rounded-xl border border-danger-soft bg-danger-soft/20 p-5">
        <h2 className="text-sm font-semibold text-foreground">Sessions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign out of every device where you&apos;re logged in.
        </p>
        <Button variant="danger" size="sm" className="mt-3" onClick={() => logoutEverywhere()}>
          Sign out everywhere
        </Button>
      </section>
    </div>
  );
}
