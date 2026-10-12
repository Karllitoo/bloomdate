import { NextResponse } from "next/server";
import { invitationSchema } from "@/lib/model";
import { adminClient } from "@/lib/supabase";
import { localMode } from "@/lib/storage-mode";
import { localStore } from "@/lib/local-store";
import {
  apiError,
  appOrigin,
  jsonBody,
  randomToken,
  requireUser,
  sameOrigin,
} from "@/lib/server";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { user } = await requireUser();
    const body = await jsonBody(request);
    const payload = invitationSchema.parse(body.invitation);
    const publish = body.publish === true;
    if (publish && !localMode()) appOrigin();
    if (localMode())
      return NextResponse.json({
        id: localStore().save(
          user.id,
          payload,
          publish,
          publish ? randomToken() : null,
        ),
      });
    const { data, error } = await adminClient().rpc("save_invitation", {
      p_owner: user.id,
      p_payload: payload,
      p_publish: publish,
      p_token: publish ? randomToken() : null,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ id: data });
  } catch (e) {
    return apiError(e);
  }
}
