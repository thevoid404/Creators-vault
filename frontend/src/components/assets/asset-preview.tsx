"use client";

import { useState } from "react";
import type { Asset } from "@/lib/types";
import { cn, isImageLike } from "@/lib/utils";
import { AssetTypeIcon } from "./asset-type-icon";

interface AssetPreviewProps {
  asset: Pick<Asset, "type" | "previewUrl" | "mimeType" | "title">;
  className?: string;
  iconClassName?: string;
  rounded?: string;
}

/**
 * Preview thumbnail. Backend file URLs are served without a bearer token
 * (api.md → "A note on file URLs"), so a plain <img> works.
 */
export function AssetPreview({
  asset,
  className,
  iconClassName,
  rounded = "rounded-lg",
}: AssetPreviewProps) {
  const [failed, setFailed] = useState(false);
  const showImage = asset.previewUrl && !failed;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-surface-2",
        rounded,
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset.previewUrl!}
          alt={asset.title}
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center text-subtle-foreground",
            iconClassName,
          )}
        >
          <AssetTypeIcon
            type={asset.type}
            className={cn(isImageLike(asset.mimeType, asset.type) ? "size-6" : "size-6")}
          />
        </div>
      )}
    </div>
  );
}
