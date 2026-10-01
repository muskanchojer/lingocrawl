"use client";

import { Check, TriangleAlert } from "lucide-react";
import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_META } from "@/lib/categories";
import { CATEGORIES, type Category } from "@/lib/validation";

const MAX_ROWS = 20;

type Row = { key: string; url: string; category: Category | null; note: string };

function newRow(): Row {
  return { key: crypto.randomUUID(), url: "", category: null, note: "" };
}

/** If the visitor typed a bare domain ("bbc.com/cymrufyw"), assume https —
 * this audience will not reliably type a scheme, and the schema requires
 * one. Leaves anything that already looks like it has a scheme alone. */
function withScheme(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length === 0 || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function SubmissionForm({
  languageId,
  onSubmitted,
}: {
  languageId: string;
  onSubmitted: (count: number) => void;
}) {
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [contributorName, setContributorName] = useState("");
  const [submitterContact, setSubmitterContact] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const honeypotId = useId();

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  // Explicit rendering, not the `.cf-turnstile` class-scan implicit mode:
  // implicit rendering scans the DOM once, when Cloudflare's script first
  // loads, so it never finds a widget div that appears on a later mount
  // (picking a different language, or clearing and reselecting, both
  // remount this form). One effect both creates and removes the widget, so
  // React's dev-mode mount/unmount/mount double-run (which would otherwise
  // remove a widget created elsewhere and never recreate it) leaves exactly
  // one live widget. Polls until the script has defined `window.turnstile`.
  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    let poll: ReturnType<typeof setTimeout> | undefined;

    function tryRender() {
      const container = turnstileContainerRef.current;
      if (cancelled || !container) return;
      if (!window.turnstile) {
        poll = setTimeout(tryRender, 100);
        return;
      }
      turnstileWidgetIdRef.current = window.turnstile.render(container, {
        sitekey: siteKey!,
        callback: (token: string) => setTurnstileToken(token),
      });
    }
    tryRender();

    return () => {
      cancelled = true;
      clearTimeout(poll);
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
      }
      turnstileWidgetIdRef.current = null;
    };
  }, [siteKey]);

  function resetTurnstile() {
    setTurnstileToken("");
    if (turnstileWidgetIdRef.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
    }
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.key !== key)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const links = rows
      .filter((row) => row.url.trim().length > 0)
      .map((row) => ({ url: withScheme(row.url), category: row.category, note: row.note.trim() }));

    if (links.length === 0) {
      setError("Add at least one link.");
      return;
    }
    if (links.some((link) => link.category === null)) {
      setError("Pick a category for every link.");
      return;
    }
    if (!turnstileToken) {
      setError("Please complete the verification challenge below.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageId,
          links,
          contributorName,
          submitterContact,
          turnstileToken,
          honeypot,
        }),
      });

      if (!response.ok) {
        setError("Something went wrong. Please check your links and try again.");
        resetTurnstile();
        return;
      }

      const data = (await response.json()) as { count: number };
      onSubmitted(data.count);
    } catch {
      setError("Something went wrong. Please try again.");
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          {rows.map((row, index) => (
          <div
            key={row.key}
            className={index > 0 ? "border-t border-border pt-4 mt-4" : ""}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-semibold text-ink-soft">
                  Website URL
                </label>
                <Input
                  placeholder="https://example.com"
                  value={row.url}
                  onChange={(e) => updateRow(row.key, { url: e.target.value })}
                  onBlur={(e) => updateRow(row.key, { url: withScheme(e.target.value) })}
                  maxLength={2048}
                />
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="mt-7 text-sm font-semibold text-ink-soft hover:text-navy"
                  aria-label={`Remove link ${index + 1}`}
                >
                  Remove
                </button>
              )}
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-sm font-semibold text-ink-soft">Category</label>
              <select
                value={row.category ?? ""}
                onChange={(e) => updateRow(row.key, { category: e.target.value as Category })}
                className="h-10 w-full border border-border bg-paper-raised px-3 text-base text-ink focus:border-navy focus:outline-none"
              >
                <option value="" disabled>
                  Choose a category
                </option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_META[category].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-sm font-semibold text-ink-soft">
                Note (optional)
              </label>
              <Input
                placeholder="e.g. National Museum of Wales"
                value={row.note}
                onChange={(e) => updateRow(row.key, { note: e.target.value })}
                maxLength={280}
              />
            </div>
          </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={rows.length >= MAX_ROWS}
          onClick={() => setRows((prev) => (prev.length >= MAX_ROWS ? prev : [...prev, newRow()]))}
          className="self-start"
        >
          + Add another link
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-soft">
              Your name
            </label>
            <Input
              value={contributorName}
              onChange={(e) => setContributorName(e.target.value)}
              maxLength={80}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-soft">
              Your email
            </label>
            <Input
              type="email"
              value={submitterContact}
              onChange={(e) => setSubmitterContact(e.target.value)}
            />
          </div>
        </div>
        <p className="text-sm text-ink-soft">
          Name and email are optional. Only used by site maintainers if we have a question — they
          are never shown on the website.
        </p>
      </div>

      {/* Honeypot: invisible to people, tempting to bots. Any fill-in
          means the request is treated as spam server-side. */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor={honeypotId}>Leave this field empty</label>
        <input
          id={honeypotId}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {siteKey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" />
          <div className="relative">
            {/* No min-height once a token exists: that means verification
                already resolved, whether or not Cloudflare drew any visible
                chrome for it (it doesn't always, with the test key) — there
                is nothing left to reserve space for. */}
            <div ref={turnstileContainerRef} className={turnstileToken ? "" : "min-h-[65px]"} />
            {!turnstileToken && (
              <div className="absolute inset-0 flex items-center border border-border bg-paper-raised px-3 text-sm text-ink-soft">
                Checking your browser...
              </div>
            )}
          </div>
        </>
      ) : (
        <p
          role="alert"
          className="flex items-start gap-2 border border-pending bg-paper-raised p-3 text-sm font-semibold text-pending"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Verification isn&apos;t configured yet (missing Turnstile site key) — submissions are
          disabled until it is.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 border border-pending bg-paper-raised p-3 font-semibold text-pending"
        >
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={submitting} className="w-full">
        {submitting ? (
          "Sending..."
        ) : (
          <>
            <Check className="h-5 w-5" aria-hidden />
            Share these links
          </>
        )}
      </Button>
    </form>
  );
}
