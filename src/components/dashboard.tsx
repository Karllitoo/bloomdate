"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Plus,
  Copy,
  Check,
  Share2,
  Eye,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { useLanguage } from "./chrome";
import { signOut } from "@/app/auth/actions";
import { planDetails } from "@/lib/export";
import { formatDate, timeLabel, optionLabel } from "@/lib/model";
import type { Invitation, SavedResponse } from "@/lib/types";
export function Dashboard({
  invitations,
  responses,
  origin,
  local = false,
}: {
  invitations: Invitation[];
  responses: SavedResponse[];
  origin: string;
  local?: boolean;
}) {
  const { lang } = useLanguage(),
    en = lang === "en";
  return (
    <div className="page-shell">
      {local && (
        <p
          className="demo-banner"
          style={{ borderRadius: 8, marginBottom: 22 }}
        >
          {en
            ? "Saved on this computer · Links work while BloomDate is running here."
            : "Disimpan di komputer ini · Pautan berfungsi semasa BloomDate berjalan di sini."}
        </p>
      )}
      <div className="page-title dashboard-top">
        <div>
          <div className="eyebrow">YOUR LITTLE CORNER OF LOVE</div>
          <h1>{en ? "Thoughtful moments." : "Detik istimewa."}</h1>
          <p>
            {en
              ? "A little courage starts here."
              : "Sedikit keberanian bermula di sini."}
          </p>
        </div>
        <div className="stack">
          <Link href="/create" className="btn">
            <Plus size={16} />
            {en ? "New invitation" : "Jemputan baharu"}
          </Link>
          <form action={signOut}>
            <button className="text-link">
              {en ? "Sign out" : "Log keluar"}
            </button>
          </form>
        </div>
      </div>
      {!invitations.length ? (
        <div className="paper empty-state">
          <Mail size={38} strokeWidth={1} />
          <h2>
            {en
              ? "Your first little invitation."
              : "Jemputan kecil pertama anda."}
          </h2>
          <p className="muted">
            {en
              ? "Someone special is a thoughtful gesture away."
              : "Insan tersayang menanti sentuhan istimewa."}
          </p>
          <Link className="btn" href="/create">
            {en ? "Make it personal" : "Cipta jemputan"}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="dashboard-grid">
          {invitations.map((inv) => (
            <InvitationCard
              key={inv.id}
              inv={inv}
              response={responses.find((r) => r.invitation_id === inv.id)}
              origin={origin}
            />
          ))}
        </div>
      )}
      <p className="small-note">
        {en
          ? "Anyone with an invitation link can open it. Revoke a link whenever you need to. Private response edit links belong to the guest."
          : "Sesiapa yang mempunyai pautan jemputan boleh membukanya. Anda boleh membatalkan pautan bila-bila masa. Pautan sunting jawapan peribadi milik tetamu."}
      </p>
    </div>
  );
}
function InvitationCard({
  inv,
  response,
  origin,
}: {
  inv: Invitation;
  response?: SavedResponse;
  origin: string;
}) {
  const { lang } = useLanguage(),
    en = lang === "en",
    router = useRouter();
  const [copied, setCopied] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState<"delete" | "revoke" | null>(null),
    [show, setShow] = useState(false);
  const expired = Boolean(
    inv.expires_at && new Date(inv.expires_at).getTime() <= Date.now(),
  );
  const status =
    inv.status === "revoked"
      ? en
        ? "Revoked"
        : "Dibatalkan"
      : expired
        ? en
          ? "Expired"
          : "Tamat tempoh"
        : inv.status === "draft"
          ? en
            ? "Draft"
            : "Draf"
          : response
            ? en
              ? "Responded"
              : "Dijawab"
            : en
              ? "Awaiting response"
              : "Menanti jawapan";
  const url = origin && inv.share_token ? `${origin}/i/${inv.share_token}` : "";
  const p = response ? planDetails(response.snapshot, response) : null;
  async function mutate() {
    if (!confirm) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/creator/invitations/${inv.id}`, {
        method: confirm === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        ...(confirm === "revoke"
          ? { body: JSON.stringify({ action: "revoke" }) }
          : {}),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setConfirm(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError(
        en
          ? "Copy the invitation link below."
          : "Salin pautan jemputan di bawah.",
      );
    }
  }
  return (
    <article className="paper inv-card">
      <span className="tag">{status}</span>
      <h2>{inv.title}</h2>
      <p>
        {en ? "For" : "Untuk"} <strong>{inv.partner}</strong> ·{" "}
        {en ? "From" : "Daripada"} {inv.sender}
      </p>
      <div className="inv-card-meta">
        {inv.expires_at &&
          `${en ? "Link expires" : "Pautan tamat"} ${new Intl.DateTimeFormat(en ? "en-GB" : "ms-MY", { dateStyle: "medium", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(inv.expires_at))}`}
      </div>
      {response && (
        <div className="response-detail">
          <b>
            {response.choice === "yes"
              ? en
                ? "♡ It’s a date!"
                : "♡ Janji temu kita!"
              : response.choice === "maybe"
                ? en
                  ? "Another day suggested"
                  : "Tarikh lain dicadangkan"
                : en
                  ? "Kindly declined"
                  : "Ditolak dengan baik"}
          </b>
          {response.choice === "yes" && p && (
            <p>
              {p.date && formatDate(p.date, lang)} ·{" "}
              {p.time && timeLabel(p.time)}
              <br />
              Asia/Kuala_Lumpur · {optionLabel(p.activity, lang)}
              {p.flower && (
                <>
                  <br />
                  {en ? "Flower preference" : "Pilihan bunga"}:{" "}
                  {optionLabel(p.flower, lang)}
                </>
              )}
              {response.snapshot.meeting_place && (
                <>
                  <br />
                  {response.snapshot.meeting_place}
                </>
              )}
            </p>
          )}
          {response.choice === "maybe" && (
            <p>
              {response.suggested_date &&
                formatDate(response.suggested_date, lang)}
              <br />
              {en
                ? "Awaiting your agreement. Contact them to agree; this is not confirmed."
                : "Menanti persetujuan anda. Hubungi mereka untuk bersetuju."}
            </p>
          )}
          {response.note && (
            <p style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>
              {response.note}
            </p>
          )}
        </div>
      )}
      <div className="inv-card-actions">
        {inv.status === "draft" && (
          <Link className="btn btn-outline" href={`/create?id=${inv.id}`}>
            {en ? "Edit draft" : "Sunting draf"}
          </Link>
        )}
        <button className="btn btn-outline" onClick={() => setShow(!show)}>
          <Eye size={14} />
          {en ? "Preview" : "Pratonton"}
        </button>
        {url && inv.status === "published" && !expired && (
          <>
            <button className="btn btn-outline" onClick={() => void copy()}>
              {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
              {copied
                ? en
                  ? "Copied"
                  : "Disalin"
                : en
                  ? "Copy link"
                  : "Salin pautan"}
            </button>
            <button
              className="btn btn-outline"
              onClick={async () => {
                try {
                  if (navigator.share)
                    await navigator.share({
                      title: "A little invitation",
                      url,
                    });
                  else await copy();
                } catch (e) {
                  if ((e as Error).name !== "AbortError")
                    setError(
                      en
                        ? "Could not share. Copy the link instead."
                        : "Tidak dapat berkongsi. Salin pautan.",
                    );
                }
              }}
            >
              <Share2 size={14} />
              {en ? "Share" : "Kongsi"}
            </button>
            <a
              className="btn btn-outline"
              href={`https://wa.me/?text=${encodeURIComponent(`A little invitation for you ♡ ${url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
            <button
              className="btn btn-ghost"
              onClick={() => setConfirm("revoke")}
            >
              {en ? "Revoke" : "Batalkan"}
            </button>
          </>
        )}
        <button className="btn btn-ghost" onClick={() => setConfirm("delete")}>
          <Trash2 size={14} />
          {en ? "Delete" : "Padam"}
        </button>
      </div>
      {show && (
        <div className="response-detail">
          <p style={{ whiteSpace: "pre-wrap" }}>{inv.message}</p>
          <p style={{ marginTop: 12 }}>
            {inv.dates.map((d) => formatDate(d.date, lang)).join(" · ")}
          </p>
          {url && !expired ? (
            <Link className="text-link" href={url}>
              {en ? "Open full invitation" : "Buka jemputan penuh"}
              <ArrowUpRight size={14} />
            </Link>
          ) : inv.status === "draft" ? (
            <Link className="text-link" href={`/create?id=${inv.id}`}>
              {en
                ? "Open draft preview in editor"
                : "Buka pratonton dalam penyunting"}
            </Link>
          ) : null}
        </div>
      )}
      {url && (
        <input
          readOnly
          aria-label={en ? "Invitation link" : "Pautan jemputan"}
          value={url}
          style={{ fontSize: 11, marginTop: 13 }}
        />
      )}
      {confirm && (
        <div className="response-detail">
          <p>
            {confirm === "delete"
              ? en
                ? "Permanently delete this invitation and its response?"
                : "Padam jemputan dan jawapan secara kekal?"
              : en
                ? "Revoke this link? The guest will no longer be able to open or edit it."
                : "Batalkan pautan? Tetamu tidak lagi boleh membuka atau menyuntingnya."}
          </p>
          <div className="inv-card-actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => void mutate()}
            >
              {en ? "Yes, continue" : "Ya, teruskan"}
            </button>
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              {en ? "Cancel" : "Batal"}
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </article>
  );
}
