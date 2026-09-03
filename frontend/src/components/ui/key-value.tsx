import { cn } from "@/lib/utils";

export function KeyValueList({
  items,
  className,
}: {
  items: { label: string; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn("divide-y divide-border", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex gap-4 py-2.5 text-sm">
          <dt className="w-40 shrink-0 text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 flex-1 text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
