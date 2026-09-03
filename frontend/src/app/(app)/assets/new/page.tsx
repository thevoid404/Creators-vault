"use client";

import { Suspense } from "react";
import { UploadCloud, Link2, ShoppingBag, StickyNote } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs } from "@/components/ui/tabs";
import { useQueryParams } from "@/lib/hooks";
import { UploadForm } from "@/components/assets/ingest/upload-form";
import { UrlImportForm } from "@/components/assets/ingest/url-import-form";
import { MarketplaceImportForm } from "@/components/assets/ingest/marketplace-import-form";
import { NoteForm } from "@/components/assets/ingest/note-form";

const MODES = [
  { value: "upload", label: "Upload", icon: <UploadCloud className="size-4" /> },
  { value: "url", label: "From URL", icon: <Link2 className="size-4" /> },
  { value: "marketplace", label: "Marketplace link", icon: <ShoppingBag className="size-4" /> },
  { value: "note", label: "Note", icon: <StickyNote className="size-4" /> },
];

function NewAssetInner() {
  const { get, set } = useQueryParams();
  const mode = get("mode") ?? "upload";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add an asset"
        description="Bring in a file, a link, or a marketplace purchase. Details are optional — tidy up later."
      />

      <Tabs
        items={MODES}
        value={mode}
        onChange={(m) => set({ mode: m === "upload" ? null : m })}
        className="mb-6"
      />

      {mode === "upload" && <UploadForm />}
      {mode === "url" && <UrlImportForm />}
      {mode === "marketplace" && <MarketplaceImportForm />}
      {mode === "note" && <NoteForm />}
    </div>
  );
}

export default function NewAssetPage() {
  return (
    <Suspense fallback={null}>
      <NewAssetInner />
    </Suspense>
  );
}
