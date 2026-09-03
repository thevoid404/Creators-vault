import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
  AssetSourceType,
  AssetType,
  LicenseType,
  ListingStatus,
  TransactionStatus,
} from "./types";

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
  const diff = Date.now() - then;
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
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong.";
}

export function initials(name: string | null | undefined, email?: string): string {
  const src = name?.trim() || email?.split("@")[0] || "?";
  return src
    .split(/[\s._-]+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ------------------------------------------------------------------ *
 * Enum → human label
 * ------------------------------------------------------------------ */

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

export const SOURCE_TYPE_LABELS: Record<AssetSourceType, string> = {
  upload: "Upload",
  url: "URL import",
  marketplace_link: "Marketplace link",
  extension: "Extension capture",
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

/** Badge tone for a transaction status — never colour alone, always paired with text. */
export const TX_STATUS_TONE: Record<
  TransactionStatus,
  "neutral" | "info" | "success" | "danger" | "warning"
> = {
  pending: "neutral",
  processing: "info",
  succeeded: "success",
  failed: "danger",
  refunded: "warning",
  cancelled: "neutral",
};

export const LISTING_STATUS_TONE: Record<
  ListingStatus,
  "neutral" | "info" | "success" | "danger" | "warning"
> = {
  draft: "warning",
  published: "success",
  unlisted: "neutral",
  sold_out: "info",
  archived: "neutral",
};
