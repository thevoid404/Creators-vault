"use client";

import { ShieldX } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function AccessDenied() {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger-soft-foreground">
        <ShieldX className="size-7" />
      </div>
      <h1 className="mt-6 text-xl font-bold text-foreground">
        You don&apos;t have access to this panel
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This console is for Creators&apos; Vault platform operators only. Your account
        {user?.email ? ` (${user.email})` : ""} is signed in but does not have the{" "}
        <span className="font-mono font-semibold">admin</span> role.
      </p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        If you believe this is a mistake, ask an existing administrator to grant you access.
      </p>
      <Button variant="secondary" onClick={() => logout()} className="mt-6">
        Sign out
      </Button>
    </div>
  );
}
