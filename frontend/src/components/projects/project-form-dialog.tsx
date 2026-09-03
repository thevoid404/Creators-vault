"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Project } from "@/lib/types";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

const SWATCHES = [
  "#7C5CFF",
  "#2563EB",
  "#0EA5E9",
  "#12A150",
  "#EAB308",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#8B5CF6",
  "#64748B",
];

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function ProjectFormDialog({
  project,
  open,
  onClose,
  onSaved,
}: {
  project?: Project;
  open: boolean;
  onClose: () => void;
  onSaved: (p: Project) => void;
}) {
  const toast = useToast();
  const editing = Boolean(project);
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [color, setColor] = useState(project?.color ?? SWATCHES[0]);
  const [coverUrl, setCoverUrl] = useState(project?.coverUrl ?? "");
  const [saving, setSaving] = useState(false);

  const colorValid = HEX.test(color);

  async function save() {
    if (!name.trim()) {
      toast.error("Give the project a name");
      return;
    }
    if (!colorValid) {
      toast.error("Colour must be a hex value like #7C5CFF");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        coverUrl: coverUrl.trim() || undefined,
      };
      const saved = editing
        ? await api.projects.update(project!.id, payload)
        : await api.projects.create(payload);
      toast.success(editing ? "Project updated" : "Project created");
      onSaved(saved);
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
      title={editing ? "Edit project" : "New project"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {editing ? "Save" : "Create project"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required>
          {({ id }) => (
            <Input
              id={id}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AudioLux"
              autoFocus
              maxLength={160}
            />
          )}
        </Field>
        <Field label="Description">
          {({ id }) => (
            <Textarea
              id={id}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project?"
              className="min-h-16"
            />
          )}
        </Field>
        <Field label="Colour">
          {() => (
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setColor(s)}
                  aria-label={`Colour ${s}`}
                  className={cn(
                    "size-7 rounded-lg border transition-transform hover:scale-110",
                    color.toLowerCase() === s.toLowerCase()
                      ? "border-foreground ring-2 ring-ring ring-offset-1 ring-offset-surface"
                      : "border-black/10",
                  )}
                  style={{ background: s }}
                />
              ))}
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-28 font-mono text-xs"
              />
            </div>
          )}
        </Field>
        <Field label="Cover image URL" hint="Optional — an absolute URL">
          {({ id }) => (
            <Input
              id={id}
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://…"
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}
