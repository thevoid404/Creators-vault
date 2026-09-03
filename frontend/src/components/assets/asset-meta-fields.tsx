"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { AssetType, LicenseType } from "@/lib/types";
import { ASSET_TYPE_LABELS, LICENSE_LABELS, cn } from "@/lib/utils";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ProjectSelect } from "./project-select";
import { TagInput } from "./tag-input";

export interface AssetMetaState {
  title: string;
  description: string;
  type: AssetType | "";
  category: string;
  licenseType: LicenseType;
  licenseNote: string;
  projectId: string;
  section: string;
  tags: string[];
}

export const emptyAssetMeta: AssetMetaState = {
  title: "",
  description: "",
  type: "",
  category: "",
  licenseType: "unknown",
  licenseNote: "",
  projectId: "",
  section: "",
  tags: [],
};

interface AssetMetaFieldsProps {
  value: AssetMetaState;
  onChange: (patch: Partial<AssetMetaState>) => void;
  /** hide the title field (upload of multiple files) */
  hideTitle?: boolean;
  titleRequired?: boolean;
  suggestAssetId?: string;
  /** start with the advanced block open */
  advancedOpen?: boolean;
}

export function AssetMetaFields({
  value,
  onChange,
  hideTitle,
  titleRequired,
  suggestAssetId,
  advancedOpen,
}: AssetMetaFieldsProps) {
  const [showAdvanced, setShowAdvanced] = useState(Boolean(advancedOpen));

  return (
    <div className="space-y-4">
      {!hideTitle && (
        <Field label="Title" required={titleRequired}>
          {({ id }) => (
            <Input
              id={id}
              value={value.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="e.g. AudioLux dashboard mockup"
            />
          )}
        </Field>
      )}

      <Field label="Description" hint="What is it, and when would you reach for it?">
        {({ id }) => (
          <Textarea
            id={id}
            value={value.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Optional — a sentence is plenty"
          />
        )}
      </Field>

      <ProjectSelect
        projectId={value.projectId}
        section={value.section}
        onProjectChange={(projectId) => onChange({ projectId })}
        onSectionChange={(section) => onChange({ section })}
      />

      <TagInput
        value={value.tags}
        onChange={(tags) => onChange({ tags })}
        suggestAssetId={suggestAssetId}
        suggestContext={
          suggestAssetId
            ? undefined
            : {
                title: value.title,
                description: value.description,
                category: value.category,
              }
        }
      />

      {/* Advanced — progressive disclosure */}
      <div className="rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-sm font-medium text-foreground"
        >
          Type, category &amp; license
          <ChevronDown
            className={cn(
              "size-4 text-subtle-foreground transition-transform",
              showAdvanced && "rotate-180",
            )}
          />
        </button>
        <AnimatePresence initial={false}>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="grid gap-4 border-t border-border p-3.5 sm:grid-cols-2">
                <Field label="Type" hint="Left blank, the server infers it">
                  {({ id }) => (
                    <Select
                      id={id}
                      value={value.type}
                      onChange={(e) => onChange({ type: e.target.value as AssetType })}
                    >
                      <option value="">Auto-detect</option>
                      {(Object.keys(ASSET_TYPE_LABELS) as AssetType[]).map((t) => (
                        <option key={t} value={t}>
                          {ASSET_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Category">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={value.category}
                      onChange={(e) => onChange({ category: e.target.value })}
                      placeholder="e.g. UI Kit"
                    />
                  )}
                </Field>
                <Field label="License">
                  {({ id }) => (
                    <Select
                      id={id}
                      value={value.licenseType}
                      onChange={(e) =>
                        onChange({ licenseType: e.target.value as LicenseType })
                      }
                    >
                      {(Object.keys(LICENSE_LABELS) as LicenseType[]).map((l) => (
                        <option key={l} value={l}>
                          {LICENSE_LABELS[l]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="License note">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={value.licenseNote}
                      onChange={(e) => onChange({ licenseNote: e.target.value })}
                      placeholder="Optional free text"
                    />
                  )}
                </Field>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Strip empty values into a payload the API accepts. */
export function assetMetaToPayload(meta: AssetMetaState) {
  return {
    title: meta.title.trim() || undefined,
    description: meta.description.trim() || undefined,
    type: meta.type || undefined,
    category: meta.category.trim() || undefined,
    licenseType: meta.licenseType !== "unknown" ? meta.licenseType : undefined,
    licenseNote: meta.licenseNote.trim() || undefined,
    projectId: meta.projectId || undefined,
    section: meta.section.trim() || undefined,
    tags: meta.tags.length ? meta.tags : undefined,
  };
}
