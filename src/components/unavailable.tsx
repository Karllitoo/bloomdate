import Link from "next/link";
import { Sprig } from "./botanical";
export function Unavailable({ setup = false }: { setup?: boolean }) {
  return (
    <section className="guest-shell">
      <div className="paper guest-paper">
        <Sprig />
        <h1>
          {setup ? "A little setup first." : "This invitation is resting."}
        </h1>
        <p className="muted">
          {setup
            ? "Connect Supabase using the steps in README.md to create and save real invitations. The demo is ready to explore."
            : "The link may be missing, expired, or revoked. You can ask the sender for a new invitation."}
        </p>
        <p className="small-note">
          {setup
            ? "Sambungkan Supabase untuk menyimpan jemputan sebenar."
            : "Pautan ini mungkin tiada, tamat tempoh, atau telah dibatalkan."}
        </p>
        <Link href={setup ? "/demo" : "/"} className="btn">
          {setup ? "Try the demo" : "Back to BloomDate"}
        </Link>
      </div>
    </section>
  );
}
