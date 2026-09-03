"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Tag } from "@/lib/types";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

const SWATCHES = [
  "#7C5CFF",
  "#2563EB",
  "#0EA5E9",
  "#12A150",
  "#EAB308",
  "#F97316",
  "#EF4444",
  "#EC4899",
  "#64748B",
];
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function TagFormDialog({
  tag,
  open,
  onClose,
  onSaved,
}: {
  tag?: Tag;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const editing = Boolean(tag);
  const [name, setName] = useState(tag?.name ?? "");
  const [color, setColor] = useState(tag?.color ?? SWATCHES[0]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Give the tag a name");
      return;
    }
    if (color && !HEX.test(color)) {
      toast.error("Colour must be a hex value");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.tags.update(tag!.id, { name: name.trim(), color });
      } else {
        await api.tags.create({ name: name.trim(), color });
      }
      toast.success(editing ? "Tag updated" : "Tag created");
      onSaved();
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 409
          ? "You already have a different tag with that name."
          : err instanceof ApiError
            ? err.messages.join(" ")
            : "Try again.";
      toast.error("Couldn't save", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit tag" : "New tag"}
      description={
        editing
          ? "Renaming changes its slug — saved asset filters using the old slug will need updating."
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {editing ? "Save" : "Create"}
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
              autoFocus
              placeholder="e.g. Dark Mode"
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
                    color?.toLowerCase() === s.toLowerCase()
                      ? "border-foreground ring-2 ring-ring ring-offset-1 ring-offset-surface"
                      : "border-black/10",
                  )}
                  style={{ background: s }}
                />
              ))}
              <Input
                value={color ?? ""}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-28 font-mono text-xs"
              />
            </div>
          )}
        </Field>
      </div>
    </Dialog>
  );
}
