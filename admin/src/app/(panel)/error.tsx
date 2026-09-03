"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-danger-soft bg-danger-soft/30 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-danger-soft-foreground">Something went wrong</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{error.message}</p>
      <Button variant="secondary" onClick={reset} className="mt-5">
        Try again
      </Button>
    </div>
  );
}
