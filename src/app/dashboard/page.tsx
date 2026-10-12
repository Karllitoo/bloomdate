import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { Unavailable } from "@/components/unavailable";
import { sessionClient } from "@/lib/supabase";
import {
  publicInvitation,
  sanitizeResponse,
  currentUser,
  currentOrigin,
} from "@/lib/server";
import { localMode, storageAvailable } from "@/lib/storage-mode";
import { localStore } from "@/lib/local-store";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "My invitations | BloomDate",
  robots: { index: false, follow: false },
};
export default async function DashboardPage() {
  if (!storageAvailable()) return <Unavailable setup />;
  const user = await currentUser();
  if (!user) redirect("/auth");
  if (localMode()) {
    const data = localStore().list(user.id);
    return <Dashboard {...data} origin={await currentOrigin()} local />;
  }
  const client = await sessionClient();
  const [{ data: rows, error }, { data: responses, error: responseError }] =
    await Promise.all([
      client
        .from("invitations")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      client
        .from("invitation_responses")
        .select(
          "id,invitation_id,version,choice,date_id,time_id,activity_id,flower_id,suggested_date,note,created_at,snapshot",
        ),
    ]);
  if (error || responseError) throw new Error("Could not load invitations.");
  const invitations = (rows || []).map((r) => ({
    ...publicInvitation(r),
    share_token: r.share_token,
    created_at: r.created_at,
  }));
  let origin = "";
  try {
    const url = new URL(process.env.NEXT_PUBLIC_APP_URL || "");
    if (url.protocol === "https:") origin = url.origin;
  } catch {}
  return (
    <Dashboard
      invitations={invitations}
      responses={(responses || []).map(sanitizeResponse)}
      origin={origin}
    />
  );
}
