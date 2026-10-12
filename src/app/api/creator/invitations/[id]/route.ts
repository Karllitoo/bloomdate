import { NextResponse } from "next/server";
import { z } from "zod";
import { adminClient } from "@/lib/supabase";
import { localMode } from "@/lib/storage-mode";
import { localStore } from "@/lib/local-store";
import { apiError, jsonBody, requireUser, sameOrigin } from "@/lib/server";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const { user } = await requireUser();
    const { id } = await params;
    z.uuid().parse(id);
    const body = await jsonBody(request);
    if (body.action !== "revoke") throw new Error("Invalid action");
    if (localMode()) {
      localStore().manage(user.id, id, "revoke");
      return NextResponse.json({ ok: true });
    }
    const { data, error } = await adminClient()
      .from("invitations")
      .update({ status: "revoked", share_token: null })
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("id")
      .single();
    if (error || !data) throw new Error("unavailable");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const { user } = await requireUser();
    const { id } = await params;
    z.uuid().parse(id);
    if (localMode()) {
      localStore().manage(user.id, id, "delete");
      return NextResponse.json({ ok: true });
    }
    const { data, error } = await adminClient()
      .from("invitations")
      .delete()
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("id")
      .single();
    if (error || !data) throw new Error("unavailable");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
