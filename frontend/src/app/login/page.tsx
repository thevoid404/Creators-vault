"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { api, API_BASE_URL } from "@/lib/api";
import { Logo } from "@/components/brand/logo";
import { Spinner } from "@/components/ui/skeleton";

const HIGHLIGHTS = [
  "Every asset — uploads, URLs, marketplace buys — in one searchable place.",
  "See why things connect: “used in the AudioLux dashboard hero”.",
  "Find by meaning, not just filename, with semantic search.",
];

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.85 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.67 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function GithubGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M12 1.5A10.5 10.5 0 0 0 1.5 12c0 4.64 3.01 8.57 7.19 9.96.53.1.72-.23.72-.5v-1.96c-2.93.64-3.55-1.24-3.55-1.24-.48-1.22-1.17-1.54-1.17-1.54-.96-.65.07-.64.07-.64 1.06.08 1.62 1.09 1.62 1.09.94 1.61 2.47 1.15 3.07.88.1-.68.37-1.15.67-1.42-2.34-.27-4.8-1.17-4.8-5.2 0-1.15.41-2.09 1.09-2.83-.11-.27-.47-1.34.1-2.8 0 0 .89-.28 2.9 1.08a10.1 10.1 0 0 1 5.28 0c2.01-1.36 2.9-1.08 2.9-1.08.57 1.46.21 2.53.1 2.8.68.74 1.09 1.68 1.09 2.83 0 4.04-2.47 4.93-4.82 5.19.38.33.72.98.72 1.98v2.93c0 .28.19.61.73.5A10.5 10.5 0 0 0 22.5 12 10.5 10.5 0 0 0 12 1.5Z" />
    </svg>
  );
}

function LoginContent() {
  const params = useSearchParams();
  const expired = params.get("expired");
  const next = params.get("next");
  const errorParam = params.get("error");

  const [githubAvailable, setGithubAvailable] = useState<boolean | null>(null);
  const [starting, setStarting] = useState<"google" | "github" | null>(null);

  useEffect(() => {
    // Optimistically probe whether GitHub OAuth is configured on the server.
    let cancelled = false;
    fetch(`${API_BASE_URL}/auth/github`, { redirect: "manual" })
      .then((res) => {
        if (cancelled) return;
        setGithubAvailable(res.status !== 503);
      })
      .catch(() => !cancelled && setGithubAvailable(true));
    return () => {
      cancelled = true;
    };
  }, []);

  function start(provider: "google" | "github") {
    setStarting(provider);
    const url = new URL(api.auth.oauthStartUrl(provider));
    // The backend reads FRONTEND_URL for the callback; `next` is preserved via the
    // callback page reading it back from its own URL after we stash it.
    if (next) sessionStorage.setItem("cv-post-login", next);
    window.location.href = url.toString();
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Left — form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mx-auto w-full max-w-sm"
        >
          <Logo className="size-10" />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">
            Sign in to Creators&apos; Vault
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your workspace for collecting, connecting and finding every digital asset
            you work with.
          </p>

          {expired && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-warning-soft bg-warning-soft/50 px-3 py-2.5 text-sm text-warning-soft-foreground">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              Your session expired. Please sign in again.
            </div>
          )}
          {errorParam && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-danger-soft bg-danger-soft/50 px-3 py-2.5 text-sm text-danger-soft-foreground">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {errorParam === "oauth"
                ? "That sign-in didn't complete. Please try again."
                : errorParam}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => start("google")}
              disabled={starting !== null}
              className="flex h-11 items-center justify-center gap-3 rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2 disabled:opacity-60"
            >
              {starting === "google" ? <Spinner className="size-5" /> : <GoogleGlyph />}
              Continue with Google
            </button>

            {githubAvailable !== false && (
              <button
                type="button"
                onClick={() => start("github")}
                disabled={starting !== null || githubAvailable === null}
                className="flex h-11 items-center justify-center gap-3 rounded-xl border border-border bg-surface-2 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-3 disabled:opacity-60"
              >
                {starting === "github" ? <Spinner className="size-5" /> : <GithubGlyph />}
                Continue with GitHub
              </button>
            )}
          </div>

          <p className="mt-6 text-xs text-subtle-foreground">
            We use OAuth — Creators&apos; Vault never sees your password. By continuing you
            agree to the terms of service and privacy policy.
          </p>
        </motion.div>
      </div>

      {/* Right — brand panel */}
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.12),transparent_40%)]" />
        <div className="relative flex h-full flex-col justify-center px-14 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
            Creators&apos; Vault
          </p>
          <h2 className="mt-4 max-w-md text-3xl font-bold leading-tight">
            Stop hunting through folders, tabs and downloads.
          </h2>
          <ul className="mt-8 flex max-w-md flex-col gap-4">
            {HIGHLIGHTS.map((line) => (
              <li key={line} className="flex items-start gap-3 text-sm text-primary-foreground/90">
                <ArrowRight className="mt-0.5 size-4 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
