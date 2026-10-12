import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { adminClient, sessionClient } from "./supabase";
import { localMode } from "./storage-mode";
import { localStore } from "./local-store";
import type { Invitation, SavedResponse } from "./types";
export const tokenPattern = /^[a-zA-Z0-9_-]{43}$/;
export function randomToken() {
  return randomBytes(32).toString("base64url");
}
export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function editToken(id: string, key: string) {
  return createHmac(
    "sha256",
    localMode()
      ? localStore().secret()
      : process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
    .update(`bloomdate:${id}:${key}`)
    .digest("base64url");
}
export async function requireUser() {
  if (localMode()) {
    const user = localStore().user(
      (await cookies()).get("bloomdate_session")?.value,
    );
    if (!user) throw new Error("unauthorized");
    return { user };
  }
  const client = await sessionClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new Error("unauthorized");
  return { user };
}
export async function currentUser() {
  try {
    return (await requireUser()).user;
  } catch {
    return null;
  }
}
export async function currentOrigin() {
  if (localMode()) {
    const h = await headers();
    return `http://${h.get("host") || "localhost:3000"}`;
  }
  return appOrigin();
}
export function publicInvitation(row: Record<string, unknown>): Invitation {
  return {
    ...(row.payload as Invitation),
    id: row.id as string,
    version: row.version as number,
    status: row.status as Invitation["status"],
    expires_at: row.expires_at as string,
  };
}
export async function getGuestInvitation(token: string) {
  if (!tokenPattern.test(token)) throw new Error("unavailable");
  if (localMode()) return localStore().guest(token);
  const { data, error } = await adminClient()
    .from("invitations")
    .select("id,payload,status,version,expires_at")
    .eq("share_token", token)
    .single();
  if (
    error ||
    !data ||
    data.status !== "published" ||
    new Date(data.expires_at).getTime() <= Date.now()
  )
    throw new Error("unavailable");
  return publicInvitation(data);
}
export function sanitizeResponse(row: Record<string, unknown>): SavedResponse {
  const {
    id,
    invitation_id,
    version,
    choice,
    date_id,
    time_id,
    activity_id,
    flower_id,
    suggested_date,
    note,
    created_at,
    snapshot,
  } = row;
  return {
    id,
    invitation_id,
    version,
    choice,
    date_id: date_id || undefined,
    time_id: time_id || undefined,
    activity_id: activity_id || undefined,
    flower_id: flower_id || undefined,
    suggested_date: suggested_date || undefined,
    note,
    created_at,
    snapshot,
    idempotency_key: "",
  } as SavedResponse;
}
export async function getEditableResponse(token: string) {
  if (!tokenPattern.test(token)) throw new Error("unavailable");
  if (localMode()) return localStore().editable(hash(token));
  const { data, error } = await adminClient()
    .from("invitation_responses")
    .select("*")
    .eq("edit_token_hash", hash(token))
    .single();
  if (error || !data) throw new Error("unavailable");
  const { data: inv } = await adminClient()
    .from("invitations")
    .select("id,payload,status,version,expires_at")
    .eq("id", data.invitation_id)
    .single();
  if (
    !inv ||
    inv.status !== "published" ||
    new Date(inv.expires_at).getTime() <= Date.now()
  )
    throw new Error("unavailable");
  return {
    invitation: publicInvitation(inv),
    response: sanitizeResponse(data),
  };
}
export async function rateLimit(scope: string, limit = 10) {
  const h = await headers();
  const ip = (
    h.get("x-vercel-forwarded-for") ||
    h.get("x-forwarded-for") ||
    "local"
  )
    .split(",")[0]
    .trim();
  if (localMode()) {
    if (!localStore().limit(hash(`${scope}:${ip}`), limit))
      throw new Error("rate_limited");
    return;
  }
  const { data, error } = await adminClient().rpc("consume_rate_limit", {
    p_key: hash(`${scope}:${ip}`),
    p_limit: limit,
  });
  if (error)
    throw new Error("Saving is temporarily unavailable. Please try again.");
  if (!data) throw new Error("rate_limited");
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new Error("Invalid request origin.");
}
export async function jsonBody(request: Request) {
  const value = await request.text();
  if (value.length > 32000) throw new Error("Please shorten your invitation.");
  return JSON.parse(value);
}
export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Please try again.";
  const mapping: Record<string, [string, number]> = {
    account_exists: ["This email already has an account. Please sign in.", 400],
    unauthorized: ["Please sign in to continue.", 401],
    unavailable: ["This link is missing, expired, or revoked.", 410],
    outdated: ["This invitation changed. Please refresh before replying.", 409],
    already_responded: [
      "A reply was already saved. Use your private edit link to change it.",
      409,
    ],
    rate_limited: [
      "Too many requests. Please wait a minute and try again.",
      429,
    ],
    invitation_not_editable: [
      "Only your own draft invitations can be edited.",
      409,
    ],
    past_date: ["Please choose future dates and times.", 400],
    invalid_options: ["Please choose options from this invitation.", 400],
    invalid_suggestion: ["Please suggest a future date.", 400],
  };
  const code = message.startsWith("This invitation changed.")
    ? "outdated"
    : message;
  const entry = Object.entries(mapping).find(([key]) => code.includes(key));
  const status = entry?.[1][1] ?? 400;
  return NextResponse.json(
    {
      error:
        entry?.[1][0] ??
        (message.includes("Supabase") || message.includes("configured")
          ? message
          : "We could not save this. Check your choices and try again."),
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
export function appOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value)
    throw new Error("Configure NEXT_PUBLIC_APP_URL before publishing.");
  const url = new URL(value);
  if (url.protocol !== "https:")
    throw new Error("Use your deployed HTTPS domain for invitation links.");
  return url.origin;
}
export function authOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  if (!value)
    throw new Error(
      "Configure NEXT_PUBLIC_APP_URL for email confirmation links.",
    );
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Use HTTPS or localhost for email confirmation.");
  return url.origin;
}
