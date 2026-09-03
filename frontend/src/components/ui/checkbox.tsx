"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled,
  className,
}: CheckboxProps) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-labelledby={label ? `${id}-label` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-0.5 flex size-[1.125rem] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border-strong bg-surface hover:border-primary",
          disabled && "opacity-50",
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </button>
      {label && (
        <div className="min-w-0">
          <label
            id={`${id}-label`}
            onClick={() => !disabled && onChange(!checked)}
            className="cursor-pointer text-sm font-medium text-foreground"
          >
            {label}
          </label>
          {hint && <p className="text-xs text-subtle-foreground">{hint}</p>}
        </div>
      )}
    </div>
  );
}
