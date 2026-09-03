import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AssetType, LicenseType, RelationType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

export function formatSizeMB(mb: number | null | undefined): string {
  if (mb === null || mb === undefined) return "—";
  if (mb < 0.1) return `${Math.round(mb * 1024)} KB`;
  if (mb < 1000) return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - then;
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  if (sec < 45) return "just now";
  if (min < 60) return `${min} min ago`;
  if (hr < 24) return `${hr} hr ago`;
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}

export function formatCurrency(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
      amount,
    );
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/* ------------------------------------------------------------------ *
 * Enum → human label
 * ------------------------------------------------------------------ */

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  image: "Image",
  vector: "Vector",
  font: "Font",
  document: "Document",
  video: "Video",
  audio: "Audio",
  archive: "Archive",
  code_snippet: "Code snippet",
  design_file: "Design file",
  link: "Link",
  other: "Other",
};

export const LICENSE_LABELS: Record<LicenseType, string> = {
  unknown: "Unknown",
  personal: "Personal use",
  commercial: "Commercial",
  extended: "Extended",
  cc0: "CC0",
  cc_by: "CC BY",
  mit: "MIT",
  apache_2_0: "Apache 2.0",
  gpl: "GPL",
  proprietary: "Proprietary",
  custom: "Custom",
};

export const RELATION_LABELS: Record<RelationType, string> = {
  used_in: "Used in",
  derived_from: "Derived from",
  alternative_to: "Alternative to",
  version_of: "Version of",
  inspired_by: "Inspired by",
  bundled_with: "Bundled with",
  depends_on: "Depends on",
  related_to: "Related to",
};

export function relationVerb(direction: "incoming" | "outgoing", type: RelationType) {
  if (direction === "outgoing") return RELATION_LABELS[type];
  // invert the phrasing for the other end
  const inverse: Partial<Record<RelationType, string>> = {
    used_in: "Uses",
    derived_from: "Source of",
    version_of: "Has version",
    depends_on: "Depended on by",
    inspired_by: "Inspired",
  };
  return inverse[type] ?? RELATION_LABELS[type];
}

/* ------------------------------------------------------------------ *
 * Misc
 * ------------------------------------------------------------------ */

export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong.";
}

/** Deterministic HSL from a string — used for tag/section chips without a color. */
export function colorFromString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 55%)`;
}

export function isImageLike(mimeType: string | null | undefined, type: AssetType): boolean {
  if (type === "image") return true;
  return Boolean(mimeType && mimeType.startsWith("image/"));
}
