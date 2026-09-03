import {
  FileImage,
  Shapes,
  Type,
  FileText,
  Video,
  Music,
  Archive,
  Code2,
  PenTool,
  Link2,
  File,
  type LucideIcon,
} from "lucide-react";
import type { AssetType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const ASSET_TYPE_ICON: Record<AssetType, LucideIcon> = {
  image: FileImage,
  vector: Shapes,
  font: Type,
  document: FileText,
  video: Video,
  audio: Music,
  archive: Archive,
  code_snippet: Code2,
  design_file: PenTool,
  link: Link2,
  other: File,
};

export function AssetTypeIcon({
  type,
  className,
}: {
  type: AssetType;
  className?: string;
}) {
  const Icon = ASSET_TYPE_ICON[type] ?? File;
  return <Icon className={cn("size-4", className)} />;
}
