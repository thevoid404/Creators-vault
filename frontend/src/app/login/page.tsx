"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Zap,
  BarChart2,
  Search,
  Image as ImageIcon,
  PlaySquare,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import { api, API_BASE_URL } from "@/lib/api";
import { Spinner } from "@/components/ui/skeleton";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
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
    <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-slate-800" fill="currentColor" aria-hidden="true">
      <path d="M12 1.5A10.5 10.5 0 0 0 1.5 12c0 4.64 3.01 8.57 7.19 9.96.53.1.72-.23.72-.5v-1.96c-2.93.64-3.55-1.24-3.55-1.24-.48-1.22-1.17-1.54-1.17-1.54-.96-.65.07-.64.07-.64 1.06.08 1.62 1.09 1.62 1.09.94 1.61 2.47 1.15 3.07.88.1-.68.37-1.15.67-1.42-2.34-.27-4.8-1.17-4.8-5.2 0-1.15.41-2.09 1.09-2.83-.11-.27-.47-1.34.1-2.8 0 0 .89-.28 2.9 1.08a10.1 10.1 0 0 1 5.28 0c2.01-1.36 2.9-1.08 2.9-1.08.57 1.46.21 2.53.1 2.8.68.74 1.09 1.68 1.09 2.83 0 4.04-2.47 4.93-4.82 5.19.38.33.72.98.72 1.98v2.93c0 .28.19.61.73.5A10.5 10.5 0 0 0 22.5 12 10.5 10.5 0 0 0 12 1.5Z" />
    </svg>
  );
}

function BrandVaultMark({ className = "size-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 p-2 shadow-md shadow-emerald-500/20 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-full" fill="none">
        <path
          d="M9 10.5 16 23l7-12.5"
          stroke="#ffffff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="14" r="2.5" stroke="#ffffff" strokeWidth="2.5" />
      </svg>
    </div>
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
    if (next) sessionStorage.setItem("cv-post-login", next);
    window.location.href = url.toString();
  }

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-[#0e0f14] text-slate-100 antialiased">
      {/* 
        Zero-GPU pure CSS backdrop with lightweight radial gradients matching the design:
        Light organic curve on the left, deep cosmic violet/indigo on the right.
      */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Left soft aura */}
        <div className="absolute -left-[10%] -top-[10%] size-[600px] rounded-full bg-gradient-to-br from-teal-500/10 via-purple-500/10 to-transparent blur-3xl sm:size-[800px]" />
        {/* Right deep violet/indigo aura */}
        <div className="absolute -right-[15%] -top-[5%] size-[700px] rounded-full bg-gradient-to-bl from-indigo-600/25 via-purple-700/20 to-transparent blur-3xl sm:size-[900px]" />
        <div className="absolute bottom-0 right-0 size-[600px] rounded-full bg-gradient-to-t from-violet-900/30 via-slate-900/40 to-transparent blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-dvh max-w-7xl lg:grid-cols-12 lg:gap-8">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Clean, high-conversion glass login card      */}
        {/* ========================================================= */}
        <div className="flex flex-col justify-between px-6 py-10 sm:px-12 lg:col-span-5 lg:py-16">
          {/* Top Logo / Brand */}
          <div className="flex items-center gap-3">
            <BrandVaultMark className="size-9" />
            <span className="text-xl font-bold tracking-tight text-white">
              Creators&apos; Vault
            </span>
          </div>

          {/* Center Form Section */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="my-auto w-full max-w-sm pt-8 lg:pt-0"
          >
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Sign in to <br />
              <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Creators&apos; Vault
              </span>
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-400">
              Your workspace for collecting, connecting, and finding every digital asset you work with.
            </p>

            {/* Error notifications */}
            {expired && (
              <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-medium text-amber-200 backdrop-blur-md">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                <span>Your session expired. Please sign in again.</span>
              </div>
            )}
            {errorParam && (
              <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-medium text-red-200 backdrop-blur-md">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
                <span>
                  {errorParam === "oauth"
                    ? "That sign-in didn't complete. Please try again."
                    : errorParam}
                </span>
              </div>
            )}

            {/* Pill Action Buttons (Exact visual match with glossy glass feel) */}
            <div className="mt-8 flex flex-col gap-3.5">
              {/* Google Button */}
              <button
                type="button"
                onClick={() => start("google")}
                disabled={starting !== null}
                className="group relative flex h-14 w-full items-center justify-between rounded-2xl border border-white/20 bg-white/95 px-5 text-slate-800 shadow-xl shadow-black/30 transition-all duration-200 hover:bg-white hover:shadow-2xl hover:shadow-purple-500/10 disabled:opacity-60"
              >
                <div className="flex items-center gap-3.5 font-semibold text-[15px]">
                  {starting === "google" ? (
                    <Spinner className="size-5 text-slate-700" />
                  ) : (
                    <GoogleGlyph />
                  )}
                  <span>Continue with Google</span>
                </div>
                <ArrowRight className="size-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-slate-800" />
              </button>

              {/* GitHub Button (if enabled) */}
              {githubAvailable !== false && (
                <button
                  type="button"
                  onClick={() => start("github")}
                  disabled={starting !== null || githubAvailable === null}
                  className="group relative flex h-14 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/90 px-5 text-slate-800 shadow-lg shadow-black/20 transition-all duration-200 hover:bg-white hover:shadow-xl disabled:opacity-60"
                >
                  <div className="flex items-center gap-3.5 font-semibold text-[15px]">
                    {starting === "github" ? (
                      <Spinner className="size-5 text-slate-700" />
                    ) : (
                      <GithubGlyph />
                    )}
                    <span>Continue with GitHub</span>
                  </div>
                  <ArrowRight className="size-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-slate-800" />
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="relative my-7 flex items-center justify-center">
              <div className="w-full border-t border-white/10" />
              <span className="absolute bg-[#0e0f14] px-3 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                or
              </span>
            </div>

            {/* Terms notice */}
            <p className="text-center text-[12px] leading-relaxed text-slate-400">
              By continuing, you agree to our{" "}
              <span className="cursor-pointer text-indigo-400 underline underline-offset-2 hover:text-indigo-300">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="cursor-pointer text-indigo-400 underline underline-offset-2 hover:text-indigo-300">
                Privacy Policy
              </span>
              .
            </p>
          </motion.div>

          {/* Bottom Security Badge */}
          <div className="mt-8 flex items-center gap-2 text-xs font-medium text-slate-400">
            <ShieldCheck className="size-4 text-emerald-400" />
            <span>Secure &amp; Private</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Rich showcase panel with glass asset mockup */}
        {/* ========================================================= */}
        <div className="relative hidden flex-col justify-center px-10 py-16 lg:col-span-7 lg:flex xl:px-16">
          <div className="relative z-10 max-w-xl">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
              <Sparkles className="size-3.5 text-purple-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                Creators&apos; Vault
              </span>
            </div>

            {/* Headline */}
            <h2 className="mt-6 text-4xl font-extrabold leading-[1.2] tracking-tight text-white xl:text-5xl">
              Stop hunting through folders, tabs{" "}
              <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-indigo-400 bg-clip-text text-transparent">
                and downloads.
              </span>
            </h2>

            {/* Feature highlights with circular frosted icons */}
            <div className="mt-10 flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                  <Zap className="size-4 text-purple-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    Every asset — uploads, URLs, marketplace purchases — in one searchable place.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                  <BarChart2 className="size-4 text-indigo-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    See why things connect: &ldquo;Used in the Audiolux dashboard hero.&rdquo;
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
                  <Search className="size-4 text-teal-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    Find by meaning, not just filename, with semantic vector search.
                  </p>
                </div>
              </div>
            </div>

            {/* Glowing 3D Glass Floating UI Card (Pure CSS/SVG, 0% CPU impact) */}
            <div className="relative mt-12 w-full max-w-md">
              {/* Outer soft ambient glow */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-500/30 to-indigo-500/30 opacity-70 blur-xl" />

              {/* Glass Card */}
              <div className="relative rounded-2xl border border-white/15 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-xl">
                {/* Search Bar pill */}
                <div className="flex h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 text-xs text-slate-400">
                  <Search className="size-4 text-slate-400" />
                  <span>Search your assets...</span>
                </div>

                {/* File format tiles */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
                    <ImageIcon className="size-5" />
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20">
                    <PlaySquare className="size-5" />
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
                    <FileText className="size-5" />
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400">
                    <MoreHorizontal className="size-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
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
