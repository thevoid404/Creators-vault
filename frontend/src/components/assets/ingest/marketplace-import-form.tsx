"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ShoppingBag } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  AssetMetaFields,
  assetMetaToPayload,
  emptyAssetMeta,
} from "@/components/assets/asset-meta-fields";

function looksLikeUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function MarketplaceImportForm() {
  const router = useRouter();
  const toast = useToast();

  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [date, setDate] = useState("");
  const [orderRef, setOrderRef] = useState("");
  const [meta, setMeta] = useState({ ...emptyAssetMeta });
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const urlError = touched && url && !looksLikeUrl(url) ? "Enter a valid http(s) URL" : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!looksLikeUrl(url)) return;
    setSubmitting(true);
    try {
      const payload = assetMetaToPayload(meta);
      const asset = await api.assets.fromMarketplaceLink({
        sourceUrl: url.trim(),
        fetchMetadata: true,
        sourcePlatform: platform.trim() || undefined,
        purchasePrice: price ? Number(price) : undefined,
        purchaseCurrency: price ? currency.trim().toUpperCase() : undefined,
        purchaseDate: date || undefined,
        purchaseOrderRef: orderRef.trim() || undefined,
        ...payload,
      });
      toast.success("Imported", asset.title);
      router.push(`/assets/${asset.id}` as Route);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 400
            ? "That URL isn't reachable, or points at a private address."
            : err.message
          : "Import failed. Try again.";
      toast.error("Couldn't import that purchase", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl border border-border bg-surface p-4">
        <Field
          label="Marketplace URL"
          required
          error={urlError}
          hint="The product page — Envato, Gumroad, Creative Market, UI8, …"
        >
          {({ id }) => (
            <div className="relative">
              <ShoppingBag className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
              <Input
                id={id}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="https://elements.envato.com/…"
                className="pl-9"
                autoFocus
              />
            </div>
          )}
        </Field>

        <div className="mt-4 rounded-lg bg-surface-2/60 p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
            Purchase record
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Entered by hand — no marketplace is contacted. All optional.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Platform">
              {({ id }) => (
                <Input
                  id={id}
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="Defaults to the URL's domain"
                />
              )}
            </Field>
            <Field label="Order reference">
              {({ id }) => (
                <Input
                  id={id}
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  placeholder="e.g. ENV-88213"
                />
              )}
            </Field>
            <div className="grid grid-cols-[1fr_5rem] gap-2">
              <Field label="Price">
                {({ id }) => (
                  <Input
                    id={id}
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="29.00"
                  />
                )}
              </Field>
              <Field label="Currency">
                {({ id }) => (
                  <Input
                    id={id}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    maxLength={3}
                  />
                )}
              </Field>
            </div>
            <Field label="Purchase date">
              {({ id }) => (
                <Input
                  id={id}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              )}
            </Field>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-semibold text-foreground">Details</p>
        <p className="mb-4 mt-0.5 text-xs text-muted-foreground">
          Anything you set here overrides what the page scrape finds.
        </p>
        <AssetMetaFields
          value={meta}
          onChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting} disabled={!url}>
          Import purchase
        </Button>
      </div>
    </form>
  );
}
