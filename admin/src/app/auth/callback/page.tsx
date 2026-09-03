"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Wordmark } from "@/components/layout/logo";
import { Spinner } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function CallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { completeLogin } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [notAdmin, setNotAdmin] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const oauthError = params.get("error") || params.get("message");

    if (oauthError) {
      setError(oauthError);
      return;
    }
    if (!accessToken || !refreshToken) {
      setError("The sign-in response was missing its tokens.");
      return;
    }

    completeLogin(accessToken, refreshToken)
      .then((user) => {
        if (user.role !== "admin") {
          // Keep the session so the access-denied screen can name the account;
          // the shell renders <AccessDenied /> for a non-admin.
          setNotAdmin(true);
          router.replace("/overview");
          return;
        }
        let dest = "/overview";
        try {
          const stashed = sessionStorage.getItem("cv-admin-post-login");
          if (stashed && stashed.startsWith("/")) dest = stashed;
          sessionStorage.removeItem("cv-admin-post-login");
        } catch {
          /* ignore */
        }
        router.replace(dest);
      })
      .catch(() => setError("We couldn't verify your account. Please try signing in again."));
  }, [params, completeLogin, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Wordmark />
      {error ? (
        <>
          <div className="mt-6 flex items-center gap-2 text-danger">
            <AlertCircle className="size-5" />
            <p className="text-sm font-semibold">Sign-in failed</p>
          </div>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{error}</p>
          <Button variant="secondary" onClick={() => router.replace("/login")} className="mt-6">
            Back to sign in
          </Button>
        </>
      ) : (
        <div className="mt-6 flex items-center gap-2 text-muted-foreground">
          <Spinner className="size-4" />
          <p className="text-sm">{notAdmin ? "Checking access…" : "Finishing sign-in…"}</p>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  );
}
