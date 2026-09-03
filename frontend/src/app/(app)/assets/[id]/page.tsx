"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { AssetDetail } from "@/components/assets/detail/asset-detail";

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <Suspense fallback={null}>
      <AssetDetail assetId={params.id} />
    </Suspense>
  );
}
