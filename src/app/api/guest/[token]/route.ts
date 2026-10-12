import { NextResponse } from "next/server";
import { responseSchema, validateSelection } from "@/lib/model";
import { adminClient } from "@/lib/supabase";
import { localMode } from "@/lib/storage-mode";
import { localStore } from "@/lib/local-store";
import {
  apiError,
  editToken,
  getGuestInvitation,
  hash,
  jsonBody,
  rateLimit,
  sameOrigin,
} from "@/lib/server";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    sameOrigin(request);
    await rateLimit("reply");
    const { token } = await params;
    const inv = await getGuestInvitation(token);
    const response = responseSchema.parse(await jsonBody(request));
    validateSelection(inv, response);
    const edit = editToken(inv.id, response.idempotency_key);
    if (localMode()) {
      localStore().submit(
        token,
        response,
        hash(edit),
        hash(response.idempotency_key),
      );
      return NextResponse.json(
        { edit_url: `/response/${edit}` },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const { error } = await adminClient().rpc("submit_response", {
      p_token: token,
      p_response: response,
      p_edit_hash: hash(edit),
      p_idempotency_hash: hash(response.idempotency_key),
      p_is_edit: false,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json(
      { edit_url: `/response/${edit}` },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
