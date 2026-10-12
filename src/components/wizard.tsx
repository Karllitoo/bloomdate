"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowRight, ArrowLeft, Eye, Check } from "lucide-react";
import { useLanguage } from "./chrome";
import { InvitationFlow } from "./invitation-flow";
import { invitationSchema, todayKL } from "@/lib/model";
import type { Invitation, Option } from "@/lib/types";
const activityLabels = [
  "Dinner together",
  "Café date",
  "Movie night",
  "Picnic",
  "Flower garden visit",
  "Sunset walk",
  "Surprise me",
];
const activityMS = [
  "Makan malam bersama",
  "Janji temu kafe",
  "Malam filem",
  "Berkelah",
  "Taman bunga",
  "Berjalan waktu senja",
  "Kejutkan saya",
];
const flowerLabels = [
  "Roses",
  "Tulips",
  "Sunflowers",
  "Lilies",
  "Baby’s breath",
  "Surprise me",
  "No flowers, just you",
];
const flowerMS = [
  "Ros",
  "Tulip",
  "Bunga matahari",
  "Lili",
  "Baby’s breath",
  "Kejutkan saya",
  "Tanpa bunga, hanya awak",
];
export function Wizard({ initial }: { initial?: Invitation }) {
  const { lang } = useLanguage(),
    en = lang === "en",
    router = useRouter();
  const [step, setStep] = useState(0),
    [preview, setPreview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [custom, setCustom] = useState("");
  const [inv, setInv] = useState<Invitation>(
    initial || {
      id: "",
      sender: "",
      partner: "",
      title: "A little time, just us.",
      message: "",
      language: lang,
      theme: "blush",
      fun_mode: true,
      timezone: "Asia/Kuala_Lumpur",
      dates: [],
      activities: [],
      flowers: [],
      meeting_place: "",
      closing: "",
      allow_suggestion: true,
      expiry_days: 14,
      status: "draft",
      version: 1,
    },
  );
  const titles = en
    ? [
        "Make it personal",
        "A day for just us",
        "Our little adventure",
        "A little bloom",
        "The finishing touches",
      ]
    : [
        "Sentuhan peribadi",
        "Hari untuk kita",
        "Aktiviti kita",
        "Bunga pilihan",
        "Sentuhan akhir",
      ];
  function update(values: Partial<Invitation>) {
    setInv((i) => ({ ...i, ...values }));
    setError("");
  }
  function toggleOption(key: "activities" | "flowers", label: string) {
    const list = inv[key];
    update({
      [key]: list.some((o) => o.label === label)
        ? list.filter((o) => o.label !== label)
        : [...list, { id: crypto.randomUUID(), label }],
    });
  }
  function addCustom() {
    if (!custom.trim()) return;
    const key = step === 2 ? "activities" : "flowers";
    if (inv[key].length >= 12) {
      setError("Choose up to 12 options.");
      return;
    }
    if (!inv[key].some((o) => o.label === custom.trim()))
      update({
        [key]: [...inv[key], { id: crypto.randomUUID(), label: custom.trim() }],
      });
    setCustom("");
  }
  function next() {
    setError("");
    if (
      step === 0 &&
      (!inv.sender.trim() ||
        !inv.partner.trim() ||
        !inv.title.trim() ||
        !inv.message.trim())
    ) {
      setError(
        en
          ? "Please fill in the names, title, and personal message."
          : "Isi nama, tajuk dan mesej peribadi.",
      );
      return;
    }
    if (step === 1) {
      if (
        !inv.dates.length ||
        inv.dates.some(
          (d) =>
            !d.date ||
            !d.times.length ||
            d.times.some(
              (t) =>
                new Date(`${d.date}T${t.time}:00+08:00`).getTime() <=
                Date.now(),
            ),
        )
      ) {
        setError(
          en
            ? "Add at least one future date and time."
            : "Tambah sekurang-kurangnya satu tarikh dan masa akan datang.",
        );
        return;
      }
    }
    if (step === 2 && !inv.activities.length) {
      setError(
        en
          ? "Choose at least one activity."
          : "Pilih sekurang-kurangnya satu aktiviti.",
      );
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
    setCustom("");
  }
  async function save(publish: boolean) {
    if (busy) return;
    const value = { ...inv, id: inv.id || crypto.randomUUID() };
    update({ id: value.id });
    const parsed = invitationSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/creator/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitation: parsed.data, publish }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const key = step === 2 ? "activities" : "flowers",
    labels = step === 2 ? activityLabels : flowerLabels,
    translations = step === 2 ? activityMS : flowerMS;
  function card(o: Option) {
    return (
      <button
        className="option-card selected"
        aria-pressed="true"
        key={o.id}
        onClick={() => toggleOption(key, o.label)}
      >
        <Check size={18} />
        {o.label}
      </button>
    );
  }
  return (
    <div className="page-shell">
      <div className="page-title">
        <div className="eyebrow">A NOTE FROM THE HEART</div>
        <h1>{en ? "Let’s make their day." : "Ceriakan hari mereka."}</h1>
        <p>
          {en
            ? "A few thoughtful details. A little invitation that feels like you."
            : "Beberapa butiran istimewa. Jemputan kecil dari hati anda."}
        </p>
      </div>
      <div className="wizard-layout">
        <aside>
          <ol className="wizard-steps">
            {titles.map((t, i) => (
              <li
                className={step === i ? "active" : ""}
                key={t}
                aria-current={step === i ? "step" : undefined}
              >
                <span>
                  {i < step ? (
                    <Check size={13} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <b style={{ fontWeight: 400 }}>{t}</b>
              </li>
            ))}
          </ol>
          <p className="small-note">
            {en
              ? "Your words stay private. Only someone with the invitation link can open it."
              : "Mesej anda peribadi. Hanya pemegang pautan boleh membukanya."}
          </p>
        </aside>
        <section className="paper wizard-paper">
          <h2>{titles[step]}.</h2>
          {step === 0 ? (
            <>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="sender">
                    {en ? "Your name" : "Nama anda"}
                  </label>
                  <input
                    id="sender"
                    maxLength={60}
                    value={inv.sender}
                    onChange={(e) => update({ sender: e.target.value })}
                    placeholder="Adam"
                  />
                </div>
                <div className="field">
                  <label htmlFor="partner">
                    {en
                      ? "Their name or nickname"
                      : "Nama atau panggilan mereka"}
                  </label>
                  <input
                    id="partner"
                    maxLength={60}
                    value={inv.partner}
                    onChange={(e) => update({ partner: e.target.value })}
                    placeholder="Alya"
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="title">
                  {en ? "Invitation title" : "Tajuk jemputan"}
                </label>
                <input
                  id="title"
                  maxLength={120}
                  value={inv.title}
                  onChange={(e) => update({ title: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="message">
                  {en ? "A personal message" : "Mesej peribadi"}
                </label>
                <textarea
                  id="message"
                  maxLength={2000}
                  value={inv.message}
                  onChange={(e) => update({ message: e.target.value })}
                  placeholder={
                    en
                      ? "Tell them why you’d love a little time together…"
                      : "Luahkan kenapa anda ingin meluangkan masa bersama…"
                  }
                />
                <small>{inv.message.length}/2000</small>
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="inv-lang">
                    {en ? "Invitation language" : "Bahasa jemputan"}
                  </label>
                  <select
                    id="inv-lang"
                    value={inv.language}
                    onChange={(e) =>
                      update({
                        language: e.target.value as Invitation["language"],
                      })
                    }
                  >
                    <option value="en">English</option>
                    <option value="ms">Bahasa Melayu</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="theme">
                    {en ? "A little colour" : "Tema warna"}
                  </label>
                  <select
                    id="theme"
                    value={inv.theme}
                    onChange={(e) =>
                      update({ theme: e.target.value as Invitation["theme"] })
                    }
                  >
                    <option value="blush">Blush Garden</option>
                    <option value="midnight">Midnight Rose</option>
                    <option value="lavender">Lavender Letter</option>
                  </select>
                </div>
              </div>
            </>
          ) : step === 1 ? (
            <>
              <p className="muted">
                {en
                  ? "Offer a few days and times you’re free."
                  : "Pilih beberapa tarikh dan masa lapang anda."}
              </p>
              <p className="small-note">Asia/Kuala_Lumpur · UTC+8</p>
              {inv.dates.map((d, i) => (
                <div className="date-editor" key={d.id}>
                  <div className="date-editor-row">
                    <label className="sr-only" htmlFor={`date-${d.id}`}>
                      {en ? "Available date" : "Tarikh pilihan"} {i + 1}
                    </label>
                    <input
                      id={`date-${d.id}`}
                      type="date"
                      min={todayKL()}
                      value={d.date}
                      onChange={(e) =>
                        update({
                          dates: inv.dates.map((x) =>
                            x.id === d.id ? { ...x, date: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <button
                      className="icon-button"
                      aria-label={en ? "Remove date" : "Buang tarikh"}
                      onClick={() =>
                        update({
                          dates: inv.dates.filter((x) => x.id !== d.id),
                        })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <div className="time-editor">
                    {d.times.map((t, j) => (
                      <div className="time-chip" key={t.id}>
                        <label className="sr-only" htmlFor={`time-${t.id}`}>
                          {en ? "Available time" : "Masa pilihan"} {j + 1}
                        </label>
                        <input
                          id={`time-${t.id}`}
                          type="time"
                          value={t.time}
                          onChange={(e) =>
                            update({
                              dates: inv.dates.map((x) =>
                                x.id === d.id
                                  ? {
                                      ...x,
                                      times: x.times.map((y) =>
                                        y.id === t.id
                                          ? { ...y, time: e.target.value }
                                          : y,
                                      ),
                                    }
                                  : x,
                              ),
                            })
                          }
                        />
                        <button
                          className="icon-button"
                          aria-label={en ? "Remove time" : "Buang masa"}
                          onClick={() =>
                            update({
                              dates: inv.dates.map((x) =>
                                x.id === d.id
                                  ? {
                                      ...x,
                                      times: x.times.filter(
                                        (y) => y.id !== t.id,
                                      ),
                                    }
                                  : x,
                              ),
                            })
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {d.times.length < 12 && (
                      <button
                        className="text-link"
                        onClick={() =>
                          update({
                            dates: inv.dates.map((x) =>
                              x.id === d.id
                                ? {
                                    ...x,
                                    times: [
                                      ...x.times,
                                      {
                                        id: crypto.randomUUID(),
                                        time: "19:00",
                                      },
                                    ],
                                  }
                                : x,
                            ),
                          })
                        }
                      >
                        <Plus size={14} />
                        {en ? "Add time" : "Tambah masa"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {inv.dates.length < 20 && (
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    const day = new Date();
                    day.setUTCDate(day.getUTCDate() + inv.dates.length + 1);
                    update({
                      dates: [
                        ...inv.dates,
                        {
                          id: crypto.randomUUID(),
                          date: day.toISOString().slice(0, 10),
                          times: [{ id: crypto.randomUUID(), time: "19:00" }],
                        },
                      ],
                    });
                  }}
                >
                  <Plus size={16} />
                  {en ? "Add a date" : "Tambah tarikh"}
                </button>
              )}
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={inv.allow_suggestion}
                  onChange={(e) =>
                    update({ allow_suggestion: e.target.checked })
                  }
                />
                {en
                  ? "Let them suggest another date."
                  : "Benarkan mereka mencadangkan tarikh lain."}
              </label>
            </>
          ) : step === 2 || step === 3 ? (
            <>
              <p className="muted">
                {step === 2
                  ? en
                    ? "Choose a few favourites or add your own."
                    : "Pilih kegemaran atau tambah pilihan sendiri."
                  : en
                    ? "Optional preferences, never a flower order."
                    : "Pilihan sahaja, bukan tempahan bunga."}
              </p>
              <div className="option-grid">
                {labels.map((label, i) => (
                  <button
                    key={label}
                    className={`option-card ${inv[key].some((o) => o.label === label) ? "selected" : ""}`}
                    aria-pressed={inv[key].some((o) => o.label === label)}
                    onClick={() => toggleOption(key, label)}
                  >
                    <span className="option-icon" aria-hidden="true">
                      {step === 2
                        ? ["🍽️", "☕", "🎬", "🧺", "🌷", "🌅", "✨"][i]
                        : ["🌹", "🌷", "🌻", "🪷", "🌼", "✨", "♡"][i]}
                    </span>
                    {en ? label : translations[i]}
                  </button>
                ))}
                {inv[key].filter((o) => !labels.includes(o.label)).map(card)}
              </div>
              <div className="custom-option">
                <label className="sr-only" htmlFor="custom-option">
                  {en ? "Custom option" : "Pilihan sendiri"}
                </label>
                <input
                  id="custom-option"
                  maxLength={80}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder={
                    en ? "Something else in mind?" : "Ada pilihan lain?"
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustom();
                    }
                  }}
                />
                <button className="btn btn-outline" onClick={addCustom}>
                  <Plus size={16} />
                  {en ? "Add" : "Tambah"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="meeting">
                  {en ? "Meeting place (optional)" : "Tempat bertemu (pilihan)"}
                </label>
                <input
                  id="meeting"
                  maxLength={200}
                  value={inv.meeting_place}
                  onChange={(e) => update({ meeting_place: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="closing">
                  {en ? "A closing note (optional)" : "Nota penutup (pilihan)"}
                </label>
                <textarea
                  id="closing"
                  maxLength={500}
                  value={inv.closing}
                  onChange={(e) => update({ closing: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="expiry">
                  {en
                    ? "Invitation link expires after"
                    : "Pautan tamat selepas"}
                </label>
                <select
                  id="expiry"
                  value={inv.expiry_days}
                  onChange={(e) =>
                    update({ expiry_days: Number(e.target.value) })
                  }
                >
                  {[3, 7, 14, 30, 60, 90].map((n) => (
                    <option key={n} value={n}>
                      {n} {en ? "days" : "hari"}
                    </option>
                  ))}
                </select>
              </div>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={inv.fun_mode}
                  onChange={(e) => update({ fun_mode: e.target.checked })}
                />
                <span>
                  {en ? "Fun Romantic Mode" : "Mod Romantik Ceria"}
                  <small style={{ display: "block", color: "var(--muted)" }}>
                    {en
                      ? "Four gentle escapes, a growing Yes, and a direct decline always available. Best for someone who enjoys a little teasing."
                      : "Empat usikan lembut, butang Ya membesar, dan pilihan tolak terus. Untuk mereka yang selesa dengan usikan."}
                  </small>
                </span>
              </label>
              <p className="small-note">
                {en
                  ? "Anyone with the link can read the invitation. Published invitations cannot be edited; revoke and create a new one to change your plan."
                  : "Sesiapa yang mempunyai pautan boleh membacanya. Jemputan diterbitkan tidak boleh disunting; batalkan dan cipta yang baharu untuk mengubah rancangan."}
              </p>
              <button
                className="btn btn-outline"
                onClick={() => setPreview(!preview)}
              >
                <Eye size={16} />
                {preview
                  ? en
                    ? "Close preview"
                    : "Tutup pratonton"
                  : en
                    ? "Preview invitation"
                    : "Pratonton jemputan"}
              </button>
              {preview && (
                <div className="preview-wrap" style={{ marginTop: 20 }}>
                  <InvitationFlow
                    key={JSON.stringify(inv)}
                    invitation={{ ...inv, version: 1 }}
                    preview
                  />
                </div>
              )}
            </>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions">
            <button
              className="btn btn-ghost"
              disabled={step === 0 || busy}
              onClick={() => {
                setStep((s) => s - 1);
                setError("");
                setCustom("");
              }}
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
              <div className="flex-center">
                <button
                  className="btn btn-outline"
                  disabled={busy}
                  onClick={() => void save(false)}
                >
                  {en ? "Save draft" : "Simpan draf"}
                </button>
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => void save(true)}
                >
                  {busy
                    ? en
                      ? "Saving…"
                      : "Menyimpan…"
                    : en
                      ? "Publish invitation"
                      : "Terbitkan jemputan"}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
