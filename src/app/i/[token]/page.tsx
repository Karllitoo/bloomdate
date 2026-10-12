import { InvitationFlow } from "@/components/invitation-flow";
import { Unavailable } from "@/components/unavailable";
import { getGuestInvitation, rateLimit } from "@/lib/server";
import { storageAvailable } from "@/lib/storage-mode";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "A little invitation | BloomDate",
  robots: { index: false, follow: false },
};
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!storageAvailable()) return <Unavailable setup />;
  try {
    await rateLimit("invitation-view", 60);
    const { token } = await params;
    const inv = await getGuestInvitation(token);
    return <InvitationFlow invitation={inv} token={token} />;
  } catch {
    return <Unavailable />;
  }
}
