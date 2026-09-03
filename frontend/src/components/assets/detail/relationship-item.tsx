"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ArrowDownLeft, ArrowUpRight, FolderKanban, Info, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { AssetNeighbour } from "@/lib/types";
import { RELATION_LABELS, cn, truncate } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { AssetTypeIcon } from "@/components/assets/asset-type-icon";

export function RelationshipItem({
  neighbour,
  onRemoved,
}: {
  neighbour: AssetNeighbour;
  onRemoved: () => void;
}) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isProject = Boolean(neighbour.project);
  const href = isProject
    ? (`/projects/${neighbour.project!.id}` as Route)
    : (`/assets/${neighbour.asset!.id}` as Route);
  const label = isProject ? neighbour.project!.name : neighbour.asset!.title;

  const longReason = neighbour.reason && neighbour.reason.length > 90;

  async function remove() {
    setRemoving(true);
    try {
      await api.relationships.remove(neighbour.relationshipId);
      toast.success("Connection removed");
      onRemoved();
    } catch {
      toast.error("Couldn't remove that connection");
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-subtle-foreground">
          {isProject ? (
            <FolderKanban className="size-4" />
          ) : (
            <AssetTypeIcon type={neighbour.asset!.type} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
                neighbour.direction === "outgoing"
                  ? "bg-primary-soft text-primary-soft-foreground"
                  : "bg-surface-2 text-muted-foreground",
              )}
            >
              {neighbour.direction === "outgoing" ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownLeft className="size-3" />
              )}
              {RELATION_LABELS[neighbour.relationType]}
            </span>
          </div>

          <Link
            href={href}
            className="mt-1 block truncate text-sm font-semibold text-foreground hover:text-primary"
          >
            {label}
          </Link>

          {neighbour.reason ? (
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-start gap-1">
                <Info className="mt-0.5 size-3 shrink-0 text-subtle-foreground" />
                <span>
                  {expanded || !longReason
                    ? neighbour.reason
                    : truncate(neighbour.reason, 90)}
                  {longReason && (
                    <button
                      type="button"
                      onClick={() => setExpanded((v) => !v)}
                      className="ml-1 font-medium text-primary hover:underline"
                    >
                      {expanded ? "less" : "more"}
                    </button>
                  )}
                </span>
              </span>
            </div>
          ) : (
            <p className="mt-1 text-xs italic text-subtle-foreground">No reason given</p>
          )}
        </div>

        <button
          type="button"
          onClick={remove}
          disabled={removing}
          aria-label="Remove connection"
          className="shrink-0 rounded-md p-1.5 text-subtle-foreground transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
