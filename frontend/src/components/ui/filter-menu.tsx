"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterMenuProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  /** single-select behaviour */
  single?: boolean;
}

export function FilterMenu({
  label,
  options,
  selected,
  onChange,
  single,
}: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function toggle(value: string) {
    if (single) {
      onChange(selected.includes(value) ? [] : [value]);
      setOpen(false);
      return;
    }
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }

  const count = selected.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
          count > 0
            ? "border-primary bg-primary-soft text-primary-soft-foreground"
            : "border-border bg-surface text-muted-foreground hover:bg-surface-2",
        )}
      >
        {label}
        {count > 0 && (
          <span className="rounded-full bg-primary/15 px-1.5 text-xs tabular-nums">
            {count}
          </span>
        )}
        <ChevronDown className="size-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-40 mt-1.5 max-h-72 w-56 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-xl shadow-black/10"
          >
            {options.length === 0 && (
              <p className="px-2.5 py-2 text-xs text-subtle-foreground">No options</p>
            )}
            {options.map((opt) => {
              const active = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-2"
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded border",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border-strong",
                    )}
                  >
                    {active && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  {opt.label}
                </button>
              );
            })}
            {count > 0 && !single && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-surface-2"
              >
                Clear
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
