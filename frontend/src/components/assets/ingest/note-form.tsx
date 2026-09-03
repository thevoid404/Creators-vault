"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-provider";
import { Button } from "@/components/ui/button";
import {
  AssetMetaFields,
  assetMetaToPayload,
  emptyAssetMeta,
} from "@/components/assets/asset-meta-fields";

export function NoteForm() {
  const router = useRouter();
  const toast = useToast();
  const [meta, setMeta] = useState({ ...emptyAssetMeta });
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const titleError = touched && !meta.title.trim() ? "A title is required" : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!meta.title.trim()) return;
    setSubmitting(true);
    try {
      const payload = assetMetaToPayload(meta);
      const asset = await api.assets.create({
        ...payload,
        title: meta.title.trim(),
      });
      toast.success("Created", asset.title);
      router.push(`/assets/${asset.id}` as Route);
    } catch (err) {
      toast.error(
        "Couldn't create that",
        err instanceof ApiError ? err.message : "Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold text-foreground">
          A reference with no file
        </p>
        <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
          For notes, placeholders, or things you&apos;ll attach a file to later.
        </p>
        <AssetMetaFields
          value={meta}
          onChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
          titleRequired
        />
        {titleError && (
          <p className="mt-2 text-xs font-medium text-danger">{titleError}</p>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          Create
        </Button>
      </div>
    </form>
  );
}
