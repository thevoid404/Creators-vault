"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { useToast } from "@/providers/toast-provider";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { AssetPicker } from "@/components/assets/asset-picker";

export function AddToProjectDialog({
  projectId,
  open,
  onClose,
  onAdded,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const toast = useToast();
  const [selected, setSelected] = useState<Asset | null>(null);
  const [section, setSection] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!selected) {
      toast.error("Pick an asset");
      return;
    }
    setSaving(true);
    try {
      await api.assets.update(selected.id, {
        projectId,
        section: section.trim() || undefined,
      });
      toast.success(`Added “${selected.title}”`);
      setSelected(null);
      setSection("");
      onAdded();
      onClose();
    } catch (err) {
      toast.error(
        "Couldn't add that asset",
        err instanceof ApiError ? err.message : "Try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add an existing asset"
      description="Move an asset into this project. It keeps its file and history."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving} disabled={!selected}>
            Add to project
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <AssetPicker selectedId={selected?.id ?? null} onSelect={setSelected} />
        <Field label="Section" hint="Optional sub-group inside the project">
          {({ id }) => (
            <Input
              id={id}
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. UI"
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}
