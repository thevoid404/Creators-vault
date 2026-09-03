"use client";

import { useQuery } from "@/lib/hooks";
import { api } from "@/lib/api";
import { Field, Select, Input } from "@/components/ui/field";

interface ProjectSelectProps {
  projectId: string;
  section: string;
  onProjectChange: (id: string) => void;
  onSectionChange: (section: string) => void;
}

export function ProjectSelect({
  projectId,
  section,
  onProjectChange,
  onSectionChange,
}: ProjectSelectProps) {
  const { data, initialLoading } = useQuery(
    () => api.projects.list({ limit: 100, sortBy: "name", sortOrder: "asc" }),
    [],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Project" hint="Group this asset with related work">
        {({ id }) => (
          <Select
            id={id}
            value={projectId}
            onChange={(e) => onProjectChange(e.target.value)}
            disabled={initialLoading}
          >
            <option value="">No project</option>
            {data?.data.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label="Section"
        hint="Sub-group inside the project, e.g. “UI”, “Brand”"
      >
        {({ id }) => (
          <Input
            id={id}
            value={section}
            onChange={(e) => onSectionChange(e.target.value)}
            placeholder="Optional"
            disabled={!projectId}
          />
        )}
      </Field>
    </div>
  );
}
