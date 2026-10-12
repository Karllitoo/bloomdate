import { InvitationFlow } from "@/components/invitation-flow";
import { demoInvitation } from "@/lib/demo";
export const dynamic = "force-dynamic";
export default function Demo() {
  return <InvitationFlow invitation={demoInvitation()} demo />;
}
