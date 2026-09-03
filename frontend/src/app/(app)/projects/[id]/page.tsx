"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { ProjectDetail } from "@/components/projects/project-detail";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <Suspense fallback={null}>
      <ProjectDetail projectId={params.id} />
    </Suspense>
  );
}
