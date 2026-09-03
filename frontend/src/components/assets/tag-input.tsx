"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import type { TagSuggestion } from "@/lib/types";
import { useDebouncedValue } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** context for auto-suggestions (unsaved form) */
  suggestContext?: { title?: string; description?: string; category?: string };
  /** context for auto-suggestions (existing asset) */
  suggestAssetId?: string;
  label?: string;
}

const REASON_LABEL: Record<TagSuggestion["reason"], string> = {
  "existing-tag": "You use this",
  "co-occurrence": "Common on similar assets",
  keyword: "From your text",
};

export function TagInput({
  value,
  onChange,
  suggestContext,
  suggestAssetId,
  label = "Tags",
}: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  const debouncedTitle = useDebouncedValue(suggestContext?.title ?? "", 500);
  const debouncedDesc = useDebouncedValue(suggestContext?.description ?? "", 500);

  useEffect(() => {
    const hasContext =
      Boolean(suggestAssetId) ||
      debouncedTitle.trim().length > 2 ||
      debouncedDesc.trim().length > 2 ||
      Boolean(suggestContext?.category);
    if (!hasContext) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoadingSuggest(true);
    api.tags
      .suggest({
        assetId: suggestAssetId,
        title: suggestAssetId ? undefined : debouncedTitle || undefined,
        description: suggestAssetId ? undefined : debouncedDesc || undefined,
        category: suggestAssetId ? undefined : suggestContext?.category || undefined,
        exclude: value,
        limit: 8,
      })
      .then((res) => !cancelled && setSuggestions(res))
      .catch(() => !cancelled && setSuggestions([]))
      .finally(() => !cancelled && setLoadingSuggest(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, debouncedDesc, suggestContext?.category, suggestAssetId, value.join(",")]);

  function add(tag: string) {
    const clean = tag.trim().replace(/,+$/, "").trim();
    if (!clean) return;
    if (value.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, clean]);
    setDraft("");
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  const visibleSuggestions = suggestions.filter(
    (s) => !value.some((t) => t.toLowerCase() === s.name.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-surface p-2 focus-within:border-primary focus-within:outline-1 focus-within:outline-primary">
        <AnimatePresence initial={false}>
          {value.map((tag) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.12 }}
              className="inline-flex items-center gap-1 rounded-md bg-primary-soft px-2 py-1 text-xs font-medium text-primary-soft-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(tag)}
                aria-label={`Remove ${tag}`}
                className="rounded-sm hover:text-primary"
              >
                <X className="size-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? "" : "Type a tag and press Enter"}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-subtle-foreground"
        />
      </div>

      {(visibleSuggestions.length > 0 || loadingSuggest) && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs text-subtle-foreground">
            <Sparkles className="size-3" />
            Suggested
          </span>
          {loadingSuggest && visibleSuggestions.length === 0 && (
            <span className="text-xs text-subtle-foreground">thinking…</span>
          )}
          {visibleSuggestions.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => add(s.name)}
              title={`${REASON_LABEL[s.reason]}${s.exists ? "" : " · new tag"}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary",
              )}
            >
              <Plus className="size-3" />
              {s.name}
              {!s.exists && <span className="text-subtle-foreground">new</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
