"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Asset, Project, RelationType } from "@/lib/types";
import { RELATION_LABELS } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { useQuery } from "@/lib/hooks";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";
import { AssetPicker } from "@/components/assets/asset-picker";

export function AddRelationshipDialog({
  sourceAsset,
  open,
  onClose,
  onCreated,
}: {
  sourceAsset: Asset;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [target, setTarget] = useState<"asset" | "project">("asset");
  const [targetAsset, setTargetAsset] = useState<Asset | null>(null);
  const [targetProjectId, setTargetProjectId] = useState("");
  const [relationType, setRelationType] = useState<RelationType>("used_in");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: projects } = useQuery<{ data: Project[] }>(
    () => api.projects.list({ limit: 100, sortBy: "name", sortOrder: "asc" }),
    [],
    { enabled: open },
  );

  async function save() {
    if (target === "asset" && !targetAsset) {
      toast.error("Pick an asset to connect");
      return;
    }
    if (target === "project" && !targetProjectId) {
      toast.error("Pick a project to connect");
      return;
    }
    setSaving(true);
    try {
      await api.relationships.create({
        sourceAssetId: sourceAsset.id,
        targetAssetId: target === "asset" ? targetAsset!.id : undefined,
        targetProjectId: target === "project" ? targetProjectId : undefined,
        relationType,
        reason: reason.trim() || undefined,
      });
      toast.success("Connected");
      onCreated();
      onClose();
      setTargetAsset(null);
      setReason("");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? "That exact connection already exists."
            : err.messages.join(" ")
          : "Try again.";
      toast.error("Couldn't connect", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Connect this asset"
      description="Link it to another asset or a project, and say why."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Create connection
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Tabs
          items={[
            { value: "asset", label: "Another asset" },
            { value: "project", label: "A project" },
          ]}
          value={target}
          onChange={(v) => setTarget(v as "asset" | "project")}
          layoutId="rel-target"
        />

        {target === "asset" ? (
          <AssetPicker
            excludeId={sourceAsset.id}
            selectedId={targetAsset?.id ?? null}
            onSelect={setTargetAsset}
          />
        ) : (
          <Field label="Project">
            {({ id }) => (
              <Select
                id={id}
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(e.target.value)}
              >
                <option value="">Choose a project…</option>
                {projects?.data.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Relationship">
            {({ id }) => (
              <Select
                id={id}
                value={relationType}
                onChange={(e) => setRelationType(e.target.value as RelationType)}
              >
                {(Object.keys(RELATION_LABELS) as RelationType[]).map((t) => (
                  <option key={t} value={t}>
                    {RELATION_LABELS[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field label="Why are they connected?" hint="One plain line — shown on the asset page">
          {({ id }) => (
            <Textarea
              id={id}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="e.g. used in the AudioLux dashboard hero"
              className="min-h-16"
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}
