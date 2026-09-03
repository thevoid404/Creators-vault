"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Link2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import {
  AssetMetaFields,
  assetMetaToPayload,
  emptyAssetMeta,
} from "@/components/assets/asset-meta-fields";

function looksLikeUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function UrlImportForm() {
  const router = useRouter();
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [fetchMetadata, setFetchMetadata] = useState(true);
  const [meta, setMeta] = useState({ ...emptyAssetMeta });
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const urlError = touched && url && !looksLikeUrl(url) ? "Enter a valid http(s) URL" : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!looksLikeUrl(url)) return;
    setSubmitting(true);
    try {
      const payload = assetMetaToPayload(meta);
      const asset = await api.assets.fromUrl({
        sourceUrl: url.trim(),
        fetchMetadata,
        ...payload,
      });
      toast.success("Imported", asset.title);
      router.push(`/assets/${asset.id}` as Route);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 400
            ? "That URL isn't reachable, or points at a private address."
            : err.message
          : "Import failed. Try again.";
      toast.error("Couldn't import that link", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl border border-border bg-surface p-4">
        <Field
          label="URL"
          required
          error={urlError}
          hint="Figma files, Dribbble shots, GitHub gists, docs — anything with a web address"
        >
          {({ id, describedBy }) => (
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
              <Input
                id={id}
                aria-describedby={describedBy}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="https://www.figma.com/file/…"
                className="pl-9"
                autoFocus
              />
            </div>
          )}
        </Field>
        <div className="mt-3">
          <Checkbox
            checked={fetchMetadata}
            onChange={setFetchMetadata}
            label="Fetch title, description and preview from the page"
            hint="Turn off to use only what you enter below"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold text-foreground">Details</p>
        <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
          Anything you set here overrides what the page scrape finds.
        </p>
        <AssetMetaFields
          value={meta}
          onChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting} disabled={!url}>
          Import link
        </Button>
      </div>
    </form>
  );
}
