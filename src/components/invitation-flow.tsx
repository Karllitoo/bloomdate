"use client";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  Download,
  Check,
  Copy,
} from "lucide-react";
import { Botanical, Sprig } from "./botanical";
import { RomanticQuestion } from "./romantic-question";
import { FlowerGarden } from "./romantic-decor";
import {
  formatDate,
  timeLabel,
  todayKL,
  validateSelection,
  optionLabel,
} from "@/lib/model";
import { downloadCalendar, downloadCard, planDetails } from "@/lib/export";
import type {
  Invitation,
  GuestResponse,
  Language,
  SavedResponse,
} from "@/lib/types";
const activityIcons: Record<string, string> = {
  "Café date": "☕",
  "Dinner together": "🍽️",
  "Movie night": "🎬",
  Picnic: "🧺",
  "Flower garden visit": "🌷",
  "Sunset walk": "🌅",
  "Surprise me": "✨",
  Roses: "🌹",
  Tulips: "🌷",
  Sunflowers: "🌻",
  Lilies: "🪷",
  "Baby’s breath": "🌼",
  "No flowers, just you": "♡",
};
export function InvitationFlow({
  invitation: inv,
  token,
  demo = false,
  preview = false,
  initialResponse,
  editToken,
}: {
  invitation: Invitation;
  token?: string;
  demo?: boolean;
  preview?: boolean;
  initialResponse?: SavedResponse;
  editToken?: string;
}) {
  const [lang, setLang] = useState<Language>(inv.language),
    [opened, setOpened] = useState(Boolean(preview || initialResponse)),
    [opening, setOpening] = useState(false),
    [step, setStep] = useState(0),
    [done, setDone] = useState(Boolean(initialResponse)),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [privateLink, setPrivateLink] = useState(
      editToken ? `/response/${editToken}` : "",
    ),
    [copied, setCopied] = useState(false);
  const [reply, setReply] = useState<GuestResponse>(
    initialResponse || {
      version: inv.version,
      choice: "yes",
      note: "",
      idempotency_key: "",
    },
  );
  const inFlight = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    heading = useRef<HTMLDivElement>(null);
  const en = lang === "en";
  useEffect(() => {
    setReply((r) => ({
      ...r,
      idempotency_key: r.idempotency_key || crypto.randomUUID(),
    }));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (opened && !done) heading.current?.focus();
  }, [step, opened, done]);
  function update(values: Partial<GuestResponse>) {
    setReply((r) => ({ ...r, ...values }));
    setError("");
  }
  function open() {
    if (opening) return;
    setOpening(true);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    timer.current = setTimeout(
      () => {
        setOpened(true);
        setOpening(false);
      },
      reduced ? 0 : 850,
    );
  }
  async function submit(choice?: GuestResponse["choice"]) {
    if (inFlight.current) return;
    const value = { ...reply, choice: choice || reply.choice };
    try {
      validateSelection(inv, value);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      if (!demo && !preview) {
        const url = editToken
          ? `/api/response/${editToken}`
          : `/api/guest/${token}`;
        const res = await fetch(url, {
          method: editToken ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        if (body.edit_url) setPrivateLink(body.edit_url);
      }
      setReply(value);
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : en
            ? "Could not save. Please try again."
            : "Tidak dapat disimpan. Cuba lagi.",
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }
  function choose(choice: "yes" | "maybe" | "no") {
    if (choice === "no") {
      void submit("no");
      return;
    }
    update({ choice });
    setStep(choice === "yes" ? 1 : 4);
  }
  function next() {
    if (step === 1 && (!reply.date_id || !reply.time_id)) {
      setError(en ? "Choose a date and time." : "Pilih tarikh dan masa.");
      return;
    }
    if (step === 2 && !reply.activity_id) {
      setError(en ? "Choose an activity." : "Pilih aktiviti.");
      return;
    }
    setStep(step === 2 && inv.flowers.length === 0 ? 4 : step + 1);
  }
  const selectedDate = inv.dates.find((d) => d.id === reply.date_id),
    details = planDetails(inv, reply);
  return (
    <div className={`theme-${inv.theme}`} lang={lang === "ms" ? "ms" : "en"}>
      {(demo || preview) && (
        <div className="demo-banner">
          {preview
            ? en
              ? "Invitation preview · Nothing will be saved"
              : "Pratonton jemputan · Tiada simpanan"
            : en
              ? "Sample invitation · Try every choice. Demo replies are not saved."
              : "Contoh jemputan · Cuba semua pilihan. Jawapan demo tidak disimpan."}
        </div>
      )}
      <section className="guest-shell">
        <FlowerGarden className="invitation-garden" />
        <Botanical className="guest-flower" />
        <Botanical className="guest-flower right" />
        <Botanical className="guest-flower extra-left" />
        <Botanical className="guest-flower extra-right" />
        <div className={`paper guest-paper ${opened ? "fade-in" : ""}`}>
          <button
            className="guest-lang"
            onClick={() => setLang(en ? "ms" : "en")}
            aria-label={en ? "Switch to Bahasa Melayu" : "Tukar ke English"}
          >
            EN / BM
          </button>
          {!opened ? (
            <>
              <div className="eyebrow" style={{ justifyContent: "center" }}>
                {en ? "SOMETHING LITTLE, JUST FOR YOU" : "KHAS UNTUK ANDA"}
              </div>
              <h1>
                {en ? "A little invitation for" : "Jemputan kecil untuk"}
                <br />
                <em>{inv.partner}.</em>
              </h1>
              <div
                className={`envelope ${opening ? "open" : ""}`}
                aria-hidden="true"
              >
                <div className="envelope-letter">
                  {inv.partner},<br />a little moment?
                </div>
                <div className="wax-seal">
                  <Heart size={21} />
                </div>
              </div>
              <button className="btn" onClick={open} disabled={opening}>
                {en ? "Open your invitation" : "Buka jemputan anda"}
                <ArrowRight size={16} />
              </button>
              <p className="small-note">
                {en ? "From" : "Daripada"} {inv.sender},{" "}
                {en ? "with a little love." : "dengan kasih sayang."}
              </p>
            </>
          ) : done ? (
            <>
              <Sprig />
              <span className="tag">
                {demo || preview
                  ? en
                    ? "Sample response"
                    : "Contoh jawapan"
                  : en
                    ? "Response saved"
                    : "Jawapan disimpan"}
              </span>
              <h1>
                {reply.choice === "yes" ? (
                  en ? (
                    <>
                      It’s <em>a date.</em>
                    </>
                  ) : (
                    <>
                      Janji temu <em>kita.</em>
                    </>
                  )
                ) : reply.choice === "maybe" ? (
                  en ? (
                    "A little rain check."
                  ) : (
                    "Mungkin lain kali."
                  )
                ) : en ? (
                  "Thank you for being honest."
                ) : (
                  "Terima kasih kerana jujur."
                )}
              </h1>
              <p className="muted">
                {reply.choice === "yes"
                  ? `${inv.sender} & ${inv.partner} ♡`
                  : reply.choice === "maybe"
                    ? en
                      ? "Your suggested date is awaiting their agreement."
                      : "Cadangan tarikh menanti persetujuan mereka."
                    : en
                      ? "Your answer is respected. Wishing you lovely days ahead."
                      : "Jawapan anda dihormati. Semoga hari anda indah."}
              </p>
              {reply.choice !== "no" && (
                <dl className="summary">
                  {reply.choice === "yes" ? (
                    <>
                      <div>
                        <dt>{en ? "Date" : "Tarikh"}</dt>
                        <dd>
                          {details.date && formatDate(details.date, lang)}
                        </dd>
                      </div>
                      <div>
                        <dt>{en ? "Time" : "Masa"}</dt>
                        <dd>
                          {details.time && timeLabel(details.time)}
                          <br />
                          <small>Asia/Kuala_Lumpur (UTC+8)</small>
                        </dd>
                      </div>
                      <div>
                        <dt>{en ? "Our little plan" : "Rancangan kita"}</dt>
                        <dd>{optionLabel(details.activity, lang)}</dd>
                      </div>
                      {details.flower && (
                        <div>
                          <dt>{en ? "Flower preference" : "Pilihan bunga"}</dt>
                          <dd>{optionLabel(details.flower, lang)}</dd>
                        </div>
                      )}
                      {inv.meeting_place && (
                        <div>
                          <dt>{en ? "Meeting place" : "Tempat bertemu"}</dt>
                          <dd>{inv.meeting_place}</dd>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <dt>{en ? "Suggested date" : "Cadangan tarikh"}</dt>
                      <dd>
                        {reply.suggested_date &&
                          formatDate(reply.suggested_date, lang)}
                      </dd>
                    </div>
                  )}
                  {reply.note && (
                    <div>
                      <dt>{en ? "A little note" : "Nota kecil"}</dt>
                      <dd style={{ whiteSpace: "pre-wrap" }}>{reply.note}</dd>
                    </div>
                  )}
                </dl>
              )}
              {reply.choice === "yes" && (
                <>
                  <p className="small-note">
                    {en
                      ? "Confirmed from the dates and times offered in this invitation. Calendar events last two hours."
                      : "Disahkan daripada tarikh dan masa yang ditawarkan. Acara kalendar berdurasi dua jam."}
                  </p>
                  <div className="flex-center">
                    <button
                      className="btn"
                      onClick={() => downloadCalendar(inv, reply)}
                    >
                      <CalendarDays size={16} />
                      {en ? "Add to calendar" : "Tambah ke kalendar"}
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() =>
                        void downloadCard(inv, reply).catch(() =>
                          setError(
                            "Could not download the card. Please try again.",
                          ),
                        )
                      }
                    >
                      <Download size={16} />
                      {en ? "Download date card" : "Muat turun kad"}
                    </button>
                  </div>
                </>
              )}
              {privateLink && (
                <div className="field" style={{ marginTop: 25 }}>
                  <label htmlFor="edit-link">
                    {en
                      ? "Your private edit link — keep this for yourself"
                      : "Pautan sunting peribadi — simpan untuk anda sahaja"}
                  </label>
                  <input
                    id="edit-link"
                    readOnly
                    value={
                      typeof window === "undefined"
                        ? privateLink
                        : `${window.location.origin}${privateLink}`
                    }
                  />
                  <button
                    className="text-link"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}${privateLink}`,
                        );
                        setCopied(true);
                      } catch {
                        setError(
                          en
                            ? "Select and copy the link above."
                            : "Pilih dan salin pautan di atas.",
                        );
                      }
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
                    {copied
                      ? en
                        ? "Copied"
                        : "Disalin"
                      : en
                        ? "Copy private edit link"
                        : "Salin pautan sunting"}
                  </button>
                </div>
              )}
              {(editToken || demo || preview) && (
                <button
                  className="text-link"
                  onClick={() => {
                    setDone(false);
                    setStep(0);
                  }}
                >
                  {en ? "Edit your response" : "Sunting jawapan anda"}
                </button>
              )}
              {inv.closing && reply.choice === "yes" && (
                <p className="guest-from">{inv.closing}</p>
              )}
            </>
          ) : (
            <>
              <div tabIndex={-1} ref={heading} className="flow-heading">
                <div
                  className="progress"
                  aria-label={
                    en
                      ? `Step ${Math.max(1, step)} of 4`
                      : `Langkah ${Math.max(1, step)} daripada 4`
                  }
                >
                  {[1, 2, 3, 4].map((s) => (
                    <span key={s} className={s <= step ? "current" : ""} />
                  ))}
                </div>
              </div>
              {step === 0 ? (
                <>
                  <Sprig />
                  <h1>{inv.title}</h1>
                  <p className="guest-note">{inv.message}</p>
                  <p className="guest-from">
                    {en ? "With love," : "Dengan kasih,"} {inv.sender}
                  </p>
                  <RomanticQuestion
                    lang={lang}
                    fun={inv.fun_mode && !editToken}
                    allowSuggestion={inv.allow_suggestion}
                    busy={saving}
                    onChoice={choose}
                  />
                </>
              ) : step === 1 ? (
                <>
                  <span className="tag">01 / 04</span>
                  <h2>{en ? "When shall we?" : "Bila kita berjumpa?"}</h2>
                  <p className="muted">
                    {en
                      ? "A day to look forward to."
                      : "Hari yang dinanti-nantikan."}
                  </p>
                  <div className="option-grid">
                    {inv.dates.map((d) => (
                      <button
                        className={`option-card ${d.id === reply.date_id ? "selected" : ""}`}
                        key={d.id}
                        aria-pressed={d.id === reply.date_id}
                        onClick={() =>
                          update({ date_id: d.id, time_id: undefined })
                        }
                      >
                        <CalendarDays size={20} />
                        {formatDate(d.date, lang)}
                      </button>
                    ))}
                  </div>
                  {selectedDate && (
                    <>
                      <p className="field-label">
                        {en ? "And what time?" : "Pukul berapa?"}
                      </p>
                      <div className="option-grid">
                        {selectedDate.times.map((t) => (
                          <button
                            className={`option-card ${reply.time_id === t.id ? "selected" : ""}`}
                            key={t.id}
                            disabled={
                              new Date(
                                `${selectedDate.date}T${t.time}:00+08:00`,
                              ).getTime() <= Date.now()
                            }
                            aria-pressed={reply.time_id === t.id}
                            onClick={() => update({ time_id: t.id })}
                          >
                            {timeLabel(t.time)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <p className="small-note">Asia/Kuala_Lumpur · UTC+8</p>
                </>
              ) : step === 2 || step === 3 ? (
                <>
                  <span className="tag">0{step} / 04</span>
                  <h2>
                    {step === 2
                      ? en
                        ? "What sounds lovely?"
                        : "Apa yang menarik?"
                      : en
                        ? "A little something for you."
                        : "Sesuatu kecil untuk anda."}
                  </h2>
                  <p className="muted">
                    {step === 2
                      ? en
                        ? "Pick our little adventure."
                        : "Pilih aktiviti kita."
                      : en
                        ? "A flower preference, if you have one."
                        : "Pilih bunga kegemaran, jika mahu."}
                  </p>
                  <div className="option-grid">
                    {(step === 2 ? inv.activities : inv.flowers).map((o) => (
                      <button
                        key={o.id}
                        className={`option-card ${(step === 2 ? reply.activity_id : reply.flower_id) === o.id ? "selected" : ""}`}
                        aria-pressed={
                          (step === 2 ? reply.activity_id : reply.flower_id) ===
                          o.id
                        }
                        onClick={() =>
                          update(
                            step === 2
                              ? { activity_id: o.id }
                              : {
                                  flower_id:
                                    reply.flower_id === o.id ? undefined : o.id,
                                },
                          )
                        }
                      >
                        <span className="option-icon" aria-hidden="true">
                          {activityIcons[o.label] || "♡"}
                        </span>
                        {optionLabel(o.label, lang)}
                      </button>
                    ))}
                  </div>
                  {step === 3 && (
                    <p className="small-note">
                      {en
                        ? "Optional. This is a preference, not a flower order."
                        : "Pilihan sahaja. Ini bukan tempahan bunga."}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <span className="tag">04 / 04</span>
                  <h2>
                    {reply.choice === "maybe"
                      ? en
                        ? "Another little day?"
                        : "Hari lain mungkin?"
                      : en
                        ? "Our little plan."
                        : "Rancangan kecil kita."}
                  </h2>
                  {reply.choice === "maybe" ? (
                    <>
                      <p className="muted">
                        {en
                          ? "A suggestion for them to agree to, at their own pace."
                          : "Cadangan untuk dipersetujui bersama."}
                      </p>
                      <div className="field" style={{ marginTop: 25 }}>
                        <label htmlFor="suggested">
                          {en ? "Suggest a date" : "Cadangkan tarikh"}
                        </label>
                        <input
                          id="suggested"
                          type="date"
                          min={todayKL()}
                          value={reply.suggested_date || ""}
                          onChange={(e) =>
                            update({ suggested_date: e.target.value })
                          }
                        />
                      </div>
                    </>
                  ) : (
                    <dl className="summary">
                      <div>
                        <dt>{en ? "Date" : "Tarikh"}</dt>
                        <dd>
                          {details.date && formatDate(details.date, lang)}
                        </dd>
                      </div>
                      <div>
                        <dt>{en ? "Time" : "Masa"}</dt>
                        <dd>
                          {details.time && timeLabel(details.time)}
                          <br />
                          Asia/Kuala_Lumpur
                        </dd>
                      </div>
                      <div>
                        <dt>{en ? "Activity" : "Aktiviti"}</dt>
                        <dd>{optionLabel(details.activity, lang)}</dd>
                      </div>
                      {details.flower && (
                        <div>
                          <dt>{en ? "Flowers" : "Bunga"}</dt>
                          <dd>{optionLabel(details.flower, lang)}</dd>
                        </div>
                      )}
                      {inv.meeting_place && (
                        <div>
                          <dt>{en ? "Meeting place" : "Tempat bertemu"}</dt>
                          <dd>{inv.meeting_place}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  <div className="field">
                    <label htmlFor="note">
                      {en
                        ? "Leave a little note (optional)"
                        : "Nota kecil (pilihan)"}
                    </label>
                    <textarea
                      id="note"
                      maxLength={1000}
                      value={reply.note}
                      onChange={(e) => update({ note: e.target.value })}
                      placeholder={
                        en
                          ? "Anything you’d like them to know…"
                          : "Apa yang ingin anda sampaikan…"
                      }
                    />
                  </div>
                </>
              )}
              {step > 0 && (
                <div className="form-actions">
                  <button
                    className="btn btn-ghost"
                    disabled={saving}
                    onClick={() =>
                      setStep(
                        reply.choice === "maybe"
                          ? 0
                          : step === 4 && inv.flowers.length === 0
                            ? 2
                            : step - 1,
                      )
                    }
                  >
                    <ArrowLeft size={15} />
                    {en ? "Back" : "Kembali"}
                  </button>
                  {step < 4 ? (
                    <button className="btn" onClick={next}>
                      {en ? "Continue" : "Teruskan"}
                      <ArrowRight size={15} />
                    </button>
                  ) : (
                    <button
                      className="btn"
                      disabled={saving}
                      onClick={() => void submit()}
                    >
                      {saving
                        ? en
                          ? "Saving…"
                          : "Menyimpan…"
                        : en
                          ? "Send my answer"
                          : "Hantar jawapan"}
                      <Heart size={15} />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
