"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionProps {
  title: string;
  description?: string;
  viewAllHref?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function Section({
  title,
  description,
  viewAllHref,
  action,
  className,
  bodyClassName,
  children,
}: SectionProps) {
  return (
    <section className={cn("rounded-xl border border-border bg-surface", className)}>
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action ??
          (viewAllHref && (
            <Link
              href={viewAllHref as Route}
              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          ))}
      </div>
      <div className={cn("border-t border-border p-3 sm:p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
