import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { submissionPayloadSchema } from "@/lib/validation";

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not set — rejecting all submissions until it is.");
    return false;
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  if (!response.ok) return false;

  const data = (await response.json()) as { success?: boolean };
  return data.success === true;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body === null) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = submissionPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { languageId, links, contributorName, submitterContact, turnstileToken, honeypot } =
    parsed.data;

  // A filled honeypot means a bot. Pretend success so it doesn't learn to
  // look elsewhere, but never write the row.
  if (honeypot) {
    return NextResponse.json({ ok: true, count: links.length });
  }

  const verified = await verifyTurnstile(turnstileToken);
  if (!verified) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const supabase = createAdminClient();
  // Explicit column set — status is never taken from the request body, so
  // every row lands as the table's default 'pending' regardless of payload.
  const rows = links.map((link) => ({
    language_id: languageId,
    url: link.url,
    category: link.category,
    note: link.note || null,
    contributor_name: contributorName || null,
    submitter_contact: submitterContact || null,
  }));

  const { error } = await supabase.from("submissions").insert(rows);
  if (error) {
    console.error("submissions insert failed", error);
    return NextResponse.json({ error: "Could not save submission" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
