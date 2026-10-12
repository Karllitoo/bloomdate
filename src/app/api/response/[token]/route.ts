import { NextResponse } from "next/server";
import { responseSchema, validateSelection } from "@/lib/model";
import { adminClient } from "@/lib/supabase";
import { localMode } from "@/lib/storage-mode";
import { localStore } from "@/lib/local-store";
import {
  apiError,
  getEditableResponse,
  hash,
  jsonBody,
  rateLimit,
  sameOrigin,
} from "@/lib/server";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    sameOrigin(request);
    await rateLimit("edit-reply");
    const { token } = await params;
    const { invitation } = await getEditableResponse(token);
    const response = responseSchema.parse(await jsonBody(request));
    validateSelection(invitation, response);
    if (localMode()) {
      localStore().submit(
        null,
        response,
        hash(token),
        hash(response.idempotency_key),
        true,
      );
      return NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const { error } = await adminClient().rpc("submit_response", {
      p_token: null,
      p_response: response,
      p_edit_hash: hash(token),
      p_idempotency_hash: hash(response.idempotency_key),
      p_is_edit: true,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
