"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { useToast } from "@/providers/toast-provider";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AssetMetaFields,
  assetMetaToPayload,
  type AssetMetaState,
} from "@/components/assets/asset-meta-fields";

function assetToMeta(asset: Asset): AssetMetaState {
  return {
    title: asset.title,
    description: asset.description ?? "",
    type: asset.type,
    category: asset.category ?? "",
    licenseType: asset.licenseType,
    licenseNote: asset.licenseNote ?? "",
    projectId: asset.project?.id ?? "",
    section: asset.section ?? "",
    tags: asset.tags.map((t) => t.name),
  };
}

export function AssetEditDialog({
  asset,
  open,
  onClose,
  onSaved,
}: {
  asset: Asset;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Asset) => void;
}) {
  const toast = useToast();
  const [meta, setMeta] = useState<AssetMetaState>(() => assetToMeta(asset));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!meta.title.trim()) {
      toast.error("Title can't be empty");
      return;
    }
    setSaving(true);
    try {
      const payload = assetMetaToPayload(meta);
      // PATCH: send tags as the full replacement set; send projectId explicitly
      // (including empty string is not allowed, so omit to keep, send to move).
      const updated = await api.assets.update(asset.id, {
        ...payload,
        title: meta.title.trim(),
        tags: meta.tags, // full set replaces
        projectId: meta.projectId || undefined,
        section: meta.section.trim() || undefined,
        licenseType: meta.licenseType,
      });
      toast.success("Saved");
      onSaved(updated);
      onClose();
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
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit asset"
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        <AssetMetaFields
          value={meta}
          onChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
          titleRequired
          suggestAssetId={asset.id}
          advancedOpen
        />
      </div>
    </Dialog>
  );
}
