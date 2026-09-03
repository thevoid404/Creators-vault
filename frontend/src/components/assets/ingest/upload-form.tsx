"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { motion } from "motion/react";
import { FileArchive, FileUp, UploadCloud, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Asset, AssetLimits } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@/lib/hooks";
import { useToast } from "@/providers/toast-provider";
import { cn, formatSizeMB } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AssetMetaFields,
  assetMetaToPayload,
  emptyAssetMeta,
} from "@/components/assets/asset-meta-fields";
import { IngestResult } from "./ingest-result";

function totalSize(files: File[]) {
  return files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);
}

export function UploadForm() {
  const router = useRouter();
  const toast = useToast();
  const { user, refreshUser } = useAuth();
  const { data: limits } = useQuery<AssetLimits>(() => api.assets.limits(), []);

  const [files, setFiles] = useState<File[]>([]);
  const [expandZip, setExpandZip] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [meta, setMeta] = useState({ ...emptyAssetMeta });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Asset[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasZip = files.some((f) => f.name.toLowerCase().endsWith(".zip"));
  const single = files.length === 1;

  const perFileLimit = limits?.maxUploadSizeMB ?? 100;
  const maxFiles = limits?.maxFilesPerRequest ?? 25;
  const quotaLeft = user ? user.storageQuotaMB - user.storageUsedMB : Infinity;

  const oversized = files.filter((f) => f.size / (1024 * 1024) > perFileLimit);
  const tooMany = files.length > maxFiles;
  const overQuota = totalSize(files) > quotaLeft;
  const blocked = oversized.length > 0 || tooMany || overQuota;

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...list.filter((f) => !seen.has(f.name + f.size))];
    });
  }, []);

  async function submit() {
    if (!files.length || blocked) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      form.append("expandZip", String(expandZip));
      const payload = assetMetaToPayload(meta);
      for (const [key, val] of Object.entries(payload)) {
        if (val === undefined) continue;
        if (key === "tags" && Array.isArray(val)) {
          form.append("tags", val.join(","));
        } else if (key === "title" && !single) {
          // title only applies to a single file
          continue;
        } else {
          form.append(key, String(val));
        }
      }
      const assets = await api.assets.upload(form);
      await refreshUser();
      toast.success(
        `Added ${assets.length} ${assets.length === 1 ? "asset" : "assets"}`,
      );
      if (assets.length === 1) {
        router.push(`/assets/${assets[0].id}` as Route);
      } else {
        setCreated(assets);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 413
            ? "That upload exceeds a size limit or your storage quota."
            : err.message
          : "Upload failed. Check your connection and try again.";
      toast.error("Upload failed", message);
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return <IngestResult assets={created} onReset={() => { setCreated(null); setFiles([]); setMeta({ ...emptyAssetMeta }); }} />;
  }

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          dragging
            ? "border-primary bg-primary-soft/40"
            : "border-border-strong bg-surface hover:bg-surface-2",
        )}
      >
        <motion.div
          animate={{ y: dragging ? -4 : 0, scale: dragging ? 1.05 : 1 }}
          transition={{ duration: 0.15 }}
          className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground"
        >
          <UploadCloud className="size-6" />
        </motion.div>
        <p className="mt-4 text-sm font-semibold text-foreground">
          Drag files here, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-primary underline-offset-2 hover:underline"
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-xs text-subtle-foreground">
          Up to {maxFiles} files · {formatSizeMB(perFileLimit)} each · drop a{" "}
          <span className="font-medium">.zip</span> to import a folder
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-sm font-medium text-foreground">
              {files.length} {files.length === 1 ? "file" : "files"} ·{" "}
              <span className="text-muted-foreground">
                {formatSizeMB(totalSize(files))}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          </div>
          <ul className="max-h-56 divide-y divide-border overflow-y-auto">
            {files.map((f, i) => {
              const mb = f.size / (1024 * 1024);
              const bad = mb > perFileLimit;
              return (
                <li
                  key={f.name + i}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm"
                >
                  {f.name.toLowerCase().endsWith(".zip") ? (
                    <FileArchive className="size-4 shrink-0 text-primary" />
                  ) : (
                    <FileUp className="size-4 shrink-0 text-subtle-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-foreground">{f.name}</span>
                  <span
                    className={cn(
                      "shrink-0 tabular-nums",
                      bad ? "text-danger" : "text-subtle-foreground",
                    )}
                  >
                    {formatSizeMB(mb)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove ${f.name}`}
                    className="shrink-0 rounded p-0.5 text-subtle-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          {hasZip && (
            <div className="border-t border-border px-4 py-3">
              <Checkbox
                checked={expandZip}
                onChange={setExpandZip}
                label="Unpack .zip into one asset per file"
                hint="Off keeps the .zip as a single archive asset"
              />
            </div>
          )}
        </div>
      )}

      {blocked && (
        <div className="rounded-lg border border-danger-soft bg-danger-soft/40 px-3 py-2.5 text-sm text-danger-soft-foreground">
          {tooMany && <p>Too many files — the limit is {maxFiles} per upload.</p>}
          {oversized.length > 0 && (
            <p>
              {oversized.length} file{oversized.length === 1 ? "" : "s"} exceed the{" "}
              {formatSizeMB(perFileLimit)} per-file limit.
            </p>
          )}
          {overQuota && (
            <p>This upload ({formatSizeMB(totalSize(files))}) exceeds your remaining storage ({formatSizeMB(quotaLeft)}).</p>
          )}
        </div>
      )}

      {files.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-foreground">
            Details {single ? "" : "(applied to every file)"}
          </p>
          <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
            All optional — you can fill these in later from the asset page.
          </p>
          <AssetMetaFields
            value={meta}
            onChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
            hideTitle={!single}
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          onClick={submit}
          loading={submitting}
          disabled={!files.length || blocked}
        >
          {files.length > 1 ? `Upload ${files.length} files` : "Upload"}
        </Button>
      </div>
    </div>
  );
}
