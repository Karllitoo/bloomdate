"use client";
import { useActionState, useState } from "react";
import { authenticate, continueLocally } from "@/app/auth/actions";
import { useLanguage } from "./chrome";
import { Sprig } from "./botanical";
export function AuthForm({
  local = false,
  next = "dashboard",
}: {
  local?: boolean;
  next?: "create" | "dashboard";
}) {
  const [signup, setSignup] = useState(local);
  const [state, action, pending] = useActionState(authenticate, {});
  const { lang } = useLanguage();
  const en = lang === "en";
  return (
    <div className="page-shell">
      <div className="paper auth-paper">
        <Sprig />
        <h1>
          {signup
            ? en
              ? "A little hello."
              : "Salam perkenalan."
            : en
              ? "Welcome back."
              : "Selamat kembali."}
        </h1>
        <p>
          {en
            ? "Your thoughtful moments start here."
            : "Detik istimewa anda bermula di sini."}
        </p>
        {local && (
          <>
            <form action={continueLocally}>
              <input type="hidden" name="next" value={next} />
              <button className="btn">
                {en ? "Continue on this computer" : "Teruskan di komputer ini"}{" "}
                →
              </button>
            </form>
            <p className="small-note">
              {en
                ? "Your invitations and replies are saved on this computer. Keep this browser session to return to them."
                : "Jemputan dan jawapan disimpan di komputer ini. Kekalkan sesi pelayar untuk membukanya semula."}
            </p>
            <details className="local-account">
              <summary>
                {en
                  ? "Or use an account to return after signing out"
                  : "Atau guna akaun untuk kembali selepas log keluar"}
              </summary>
              <LocalAccountDescription en={en} />
            </details>
          </>
        )}
        <form action={action}>
          <input type="hidden" name="next" value={next} />
          <input
            type="hidden"
            name="mode"
            value={signup ? "signup" : "signin"}
          />
          <div className="field">
            <label htmlFor="email">
              {en ? "Email address" : "Alamat e-mel"}
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </div>
          <div className="field">
            <label htmlFor="password">{en ? "Password" : "Kata laluan"}</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              minLength={8}
              maxLength={128}
              required
            />
            <small>
              {en ? "At least 8 characters." : "Sekurang-kurangnya 8 aksara."}
            </small>
          </div>
          {state.error && (
            <div className="error" role="alert">
              {state.error}
            </div>
          )}
          {state.message && (
            <div className="success" role="status">
              {state.message}
            </div>
          )}
          <button className="btn" disabled={pending}>
            {pending
              ? en
                ? "One moment…"
                : "Sebentar…"
              : signup
                ? en
                  ? "Create account"
                  : "Cipta akaun"
                : en
                  ? "Sign in"
                  : "Log masuk"}
          </button>
        </form>
        <button
          className="text-link"
          style={{ marginTop: 20 }}
          onClick={() => setSignup(!signup)}
        >
          {signup
            ? en
              ? "Already have an account? Sign in"
              : "Sudah berdaftar? Log masuk"
            : en
              ? "New here? Create an account"
              : "Pengguna baharu? Cipta akaun"}
        </button>
        <p className="small-note">
          {en
            ? "Guests never need an account to reply."
            : "Tetamu tidak memerlukan akaun untuk menjawab."}
        </p>
      </div>
    </div>
  );
}
function LocalAccountDescription({ en }: { en: boolean }) {
  return (
    <p className="small-note">
      {en
        ? "Use the email and password fields below to create a local account. No email confirmation is needed here."
        : "Gunakan e-mel dan kata laluan di bawah untuk cipta akaun tempatan. Tiada pengesahan e-mel diperlukan."}
    </p>
  );
}
