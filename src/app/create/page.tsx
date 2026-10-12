import { redirect, notFound } from "next/navigation";
import { Wizard } from "@/components/wizard";
import { Unavailable } from "@/components/unavailable";
import { sessionClient } from "@/lib/supabase";
import { publicInvitation, currentUser } from "@/lib/server";
import { localMode, storageAvailable } from "@/lib/storage-mode";
import { localStore } from "@/lib/local-store";
import { z } from "zod";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Create an invitation | BloomDate",
  robots: { index: false, follow: false },
};
export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  if (!storageAvailable()) return <Unavailable setup />;
  const user = await currentUser();
  if (!user) redirect("/auth?next=create");
  const { id } = await searchParams;
  let initial;
  if (id) {
    if (!z.uuid().safeParse(id).success) notFound();
    if (localMode()) {
      initial = localStore().draft(user.id, id);
      if (!initial) notFound();
      return <Wizard initial={initial} />;
    }
    const client = await sessionClient();
    const { data } = await client
      .from("invitations")
      .select("*")
      .eq("id", id)
      .eq("owner_id", user.id)
      .eq("status", "draft")
      .single();
    if (!data) notFound();
    initial = publicInvitation(data);
  }
  return <Wizard initial={initial} />;
}
