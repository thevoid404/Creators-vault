import Link from "next/link";
import { Wordmark } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Wordmark />
      <p className="mt-6 text-sm font-semibold text-foreground">Page not found</p>
      <p className="mt-1 text-sm text-muted-foreground">
        That route doesn&apos;t exist in the admin panel.
      </p>
      <Link
        href="/overview"
        className="mt-5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-surface-2"
      >
        Back to overview
      </Link>
    </div>
  );
}
