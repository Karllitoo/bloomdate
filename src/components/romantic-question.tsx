"use client";
import { useEffect, useRef, useState } from "react";
import { messages, MAX_ESCAPES } from "@/lib/model";
import type { Language } from "@/lib/types";
import { FlowerGarden, TeddyBear } from "./romantic-decor";
export function RomanticQuestion({
  lang,
  fun,
  onChoice,
  allowSuggestion,
  busy,
}: {
  lang: Language;
  fun: boolean;
  onChoice: (choice: "yes" | "maybe" | "no") => void;
  allowSuggestion: boolean;
  busy: boolean;
}) {
  const [attempt, setAttempt] = useState(0),
    [skip, setSkip] = useState(false),
    [reduced, setReduced] = useState(true),
    [keyboard, setKeyboard] = useState(false),
    [warning, setWarning] = useState(false);
  const suppress = useRef(false),
    attemptRef = useRef(0),
    dialog = useRef<HTMLDialogElement>(null),
    bigYesDialog = useRef<HTMLDialogElement>(null),
    arena = useRef<HTMLDivElement>(null),
    noButton = useRef<HTMLButtonElement>(null);
  const [bounds, setBounds] = useState([42, 18]);
  const en = lang === "en",
    enabled = fun && !skip && !reduced && !keyboard,
    fullscreen = enabled && attempt >= MAX_ESCAPES && !warning;
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Tab") setKeyboard(true);
    };
    window.addEventListener("keydown", key);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("keydown", key);
    };
  }, []);
  useEffect(() => {
    if (fullscreen) {
      if (!bigYesDialog.current?.open) bigYesDialog.current?.showModal();
    } else bigYesDialog.current?.close();
    if (warning && !dialog.current?.open) dialog.current?.showModal();
    if (!warning) dialog.current?.close();
  }, [warning, fullscreen]);
  useEffect(() => {
    if (!fullscreen && !warning) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [fullscreen, warning]);
  useEffect(() => {
    const measure = () => {
      if (arena.current && noButton.current && arena.current.clientWidth > 0)
        setBounds([
          Math.max(
            0,
            (arena.current.clientWidth - noButton.current.offsetWidth) / 2 - 8,
          ),
          Math.max(
            0,
            (arena.current.clientHeight - noButton.current.offsetHeight) / 2 -
              5,
          ),
        ]);
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    if (arena.current) observer?.observe(arena.current);
    if (noButton.current) observer?.observe(noButton.current);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [lang]);
  function tease() {
    if (!enabled || busy || attemptRef.current >= 10) return false;
    const next = attemptRef.current + 1;
    attemptRef.current = next;
    setAttempt(next);
    if (next === 10) setWarning(true);
    return next <= MAX_ESCAPES;
  }
  const offsets = [
    [0, 0],
    [-42, 15],
    [42, -15],
    [-35, -16],
    [35, 15],
  ];
  const [x, y] = enabled ? offsets[Math.min(attempt, 4)] : [0, 0];
  function choose(choice: "yes" | "maybe" | "no") {
    setWarning(false);
    setSkip(true);
    onChoice(choice);
  }
  return (
    <div className="question-block">
      <FlowerGarden className="question-flower-garden" />
      <div className="question-content" hidden={fullscreen || warning}>
        <div className="question-heading">
          <h2>
            {en
              ? "Would you like to go on a date with me?"
              : "Sudi keluar berjanji temu dengan saya?"}
          </h2>
          <div className="question-mascot" aria-hidden="true">
            <TeddyBear pose={attempt >= 3 ? "bouquet" : "heart"} />
            <span>
              {en ? "a little date, a big hug ♡" : "satu date, satu pelukan ♡"}
            </span>
          </div>
        </div>
        <div className="playful-message" aria-live="polite" aria-atomic="true">
          {enabled && attempt > 0 && (
            <span key={attempt}>
              {messages[Math.min(attempt - 1, 4)][lang]}
            </span>
          )}
          {enabled && attempt >= 4 && attempt < 10 && (
            <button
              className="icon-button"
              type="button"
              onClick={() => tease()}
              aria-label={
                en
                  ? "One more little tease (optional)"
                  : "Usik lagi sedikit (pilihan)"
              }
            >
              🌸
            </button>
          )}
        </div>
        <div className="yes-arena">
          <button
            className="btn yes-btn"
            disabled={busy}
            onClick={() => choose("yes")}
            style={{
              fontSize: `${enabled ? 18 + Math.min(attempt, 4) * 6 : 18}px`,
              width: `${enabled ? Math.min(100, 54 + attempt * 13) : 54}%`,
              minHeight: `${enabled ? 64 + Math.min(attempt, 4) * 22 : 64}px`,
            }}
          >
            ❤️ {en ? "Yes, I'd love to" : "Ya, saya sudi"}
          </button>
        </div>
        <div className="no-arena" ref={arena}>
          <button
            ref={noButton}
            type="button"
            className="no-btn"
            disabled={busy}
            style={{
              transform: `translate(${Math.max(-bounds[0], Math.min(bounds[0], x))}px, ${Math.max(-bounds[1], Math.min(bounds[1], y))}px)`,
            }}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") tease();
            }}
            onPointerDown={(e) => {
              suppress.current = false;
              if (
                e.pointerType === "touch" &&
                enabled &&
                attemptRef.current < MAX_ESCAPES
              ) {
                e.preventDefault();
                suppress.current = tease();
              }
            }}
            onClick={(e) => {
              if (e.detail === 0) {
                choose("no");
                return;
              }
              if (suppress.current) {
                suppress.current = false;
                return;
              }
              choose("no");
            }}
          >
            🌸 {en ? "No, thank you" : "Tidak, terima kasih"}
          </button>
        </div>
        <div className="escape-links">
          {allowSuggestion && (
            <button disabled={busy} onClick={() => choose("maybe")}>
              {en ? "Maybe another day" : "Mungkin hari lain"}
            </button>
          )}
          {fun && (
            <button disabled={busy} onClick={() => choose("no")}>
              {en ? "Decline directly" : "Tolak terus"}
            </button>
          )}
          {enabled && (
            <button onClick={() => setSkip(true)}>
              {en ? "Skip the teasing" : "Langkau usikan"}
            </button>
          )}
        </div>
        <p className="choice-caption">
          {busy
            ? en
              ? "Saving your answer…"
              : "Menyimpan jawapan…"
            : en
              ? "Your answer is always yours. ♡"
              : "Pilihan anda sentiasa dihormati. ♡"}
        </p>
      </div>
      {enabled && attempt >= 3 && (
        <div key={attempt} className="petal-layer" aria-hidden="true">
          {Array.from(
            { length: 30 },
            (_, i) => ["🌸", "♡", "🌷", "🌼", "🌺"][i % 5],
          ).map((p, i) => (
            <span
              className="petal"
              key={i}
              style={{
                left: `${3 + ((i * 17) % 94)}%`,
                top: `${25 + (i % 5) * 13}%`,
                animationDelay: `${(i % 10) * 0.1}s`,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      )}
      <dialog
        ref={bigYesDialog}
        className="big-yes-dialog"
        aria-labelledby="big-yes-title"
        onCancel={() => setSkip(true)}
        onClose={() => {
          if (fullscreen) setSkip(true);
        }}
      >
        {fullscreen && (
          <>
            <button
              className="big-yes-button"
              aria-label={`❤️ ${en ? "Yes, I'd love to" : "Ya, saya sudi"}`}
              disabled={busy}
              onClick={() => choose("yes")}
            >
              <span className="big-yes-content">
                <span className="big-yes-kicker">
                  {en
                    ? "Okay, my heart got a little carried away…"
                    : "Alamak, hati saya dah terlebih excited…"}
                </span>
                <span className="big-yes-bears" aria-hidden="true">
                  <TeddyBear pose="bouquet" />
                  <span className="big-yes-heart">♡</span>
                  <TeddyBear />
                </span>
                <strong>{en ? "Yes, I'd love to!" : "Ya, saya sudi!"}</strong>
                <span className="big-yes-subtitle">
                  {en
                    ? "A little yes. A lovely little memory. ♡"
                    : "Satu ya. Satu kenangan paling comel. ♡"}
                </span>
              </span>
            </button>
            <FlowerGarden className="fullscreen-garden" />
            <div className="big-yes-top">
              <h2 id="big-yes-title">
                {en ? "One little date with me?" : "Satu date dengan saya?"}
              </h2>
              <button
                type="button"
                className="big-yes-close"
                onClick={() => setSkip(true)}
                aria-label={
                  en
                    ? "Close the big Yes and skip teasing"
                    : "Tutup Ya besar dan langkau usikan"
                }
              >
                ✕
              </button>
            </div>
            <div className="big-yes-options">
              <p className="big-yes-message" aria-live="polite">
                {messages[Math.min(attempt - 1, 4)][lang]}
              </p>
              <div className="big-yes-alternatives">
                <button
                  type="button"
                  className="no-btn"
                  disabled={busy}
                  onClick={() => choose("no")}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") tease();
                  }}
                >
                  🌸 {en ? "No, thank you" : "Tidak, terima kasih"}
                </button>
                {allowSuggestion && (
                  <button
                    type="button"
                    className="big-yes-maybe"
                    disabled={busy}
                    onClick={() => choose("maybe")}
                  >
                    {en ? "Maybe another day" : "Mungkin hari lain"}
                  </button>
                )}
                {attempt < 10 && (
                  <button
                    type="button"
                    className="big-yes-more"
                    onClick={() => tease()}
                    aria-label={
                      en
                        ? "One more little tease (optional)"
                        : "Usik lagi sedikit (pilihan)"
                    }
                  >
                    🌸
                  </button>
                )}
              </div>
              <p className="big-yes-respect">
                {en
                  ? "Big button, same choice. No is still completely okay. ♡"
                  : "Butang besar, pilihan tetap milik awak. Tak pun tak apa. ♡"}
              </p>
            </div>
          </>
        )}
      </dialog>
      <dialog
        ref={dialog}
        className="romantic-dialog"
        onCancel={() => setWarning(false)}
        onClose={() => setWarning(false)}
        aria-labelledby="warning-title"
      >
        <div className="paper modal-card">
          <span className="tag">{en ? "Attempt #10" : "Cubaan #10"}</span>
          <h2 id="warning-title">🚨 WARNING 🚨</h2>
          <p>
            {en ? (
              <>
                You are extremely committed to pressing
                <br />
                “No, thank you.”
              </>
            ) : (
              <>
                Anda sangat bertekad untuk menekan
                <br />
                “Tidak, terima kasih.”
              </>
            )}
          </p>
          <div className="warning-stats">
            <p>
              Respect level <b>100%</b>
            </p>
            <p>
              Sadness level <b>99%</b>
            </p>
            <p>
              Hope level <b>1%</b>
            </p>
          </div>
          <div className="stack">
            <button
              className="btn btn-outline"
              disabled={busy}
              onClick={() => choose("no")}
            >
              🥺 Okay, saya faham
            </button>
            <button
              className="btn"
              disabled={busy}
              onClick={() => choose("yes")}
            >
              ❤️ Tapi kalau berubah fikiran...
            </button>
            <button className="text-link" onClick={() => setWarning(false)}>
              {en ? "Close" : "Tutup"}
            </button>
          </div>
          <p className="small-note">
            {en
              ? "A little joke, with full respect for your choice."
              : "Sekadar gurauan. Pilihan anda dihormati sepenuhnya."}
          </p>
        </div>
      </dialog>
    </div>
  );
}
