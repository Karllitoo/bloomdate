import { InvitationFlow } from "@/components/invitation-flow";
import { Unavailable } from "@/components/unavailable";
import { getEditableResponse, rateLimit } from "@/lib/server";
import { storageAvailable } from "@/lib/storage-mode";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your response | BloomDate",
  robots: { index: false, follow: false },
};
export default async function ResponsePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!storageAvailable()) return <Unavailable setup />;
  try {
    await rateLimit("response-view", 30);
    const { token } = await params;
    const { invitation, response } = await getEditableResponse(token);
    return (
      <InvitationFlow
        invitation={invitation}
        initialResponse={response}
        editToken={token}
      />
    );
  } catch {
    return <Unavailable />;
  }
}
