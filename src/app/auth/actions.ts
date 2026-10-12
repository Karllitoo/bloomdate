"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sessionClient } from "@/lib/supabase";
import { authOrigin } from "@/lib/server";
import { rateLimit } from "@/lib/server";
import { localMode } from "@/lib/storage-mode";
import { localStore } from "@/lib/local-store";
import { cookies, headers } from "next/headers";
async function setLocalSession(token: string) {
  (await cookies()).set("bloomdate_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (await headers()).get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: 30 * 86400,
  });
}
export async function authenticate(
  _: { error?: string; message?: string },
  form: FormData,
): Promise<{ error?: string; message?: string }> {
  const next = form.get("next") === "create" ? "/create" : "/dashboard";
  try {
    const email = z.email().parse(form.get("email"));
    const password = z.string().min(8).max(128).parse(form.get("password"));
    if (localMode()) {
      await rateLimit("local-auth", 10);
      const token =
        form.get("mode") === "signup"
          ? localStore().signup(email, password)
          : localStore().signin(email, password);
      await setLocalSession(token);
    } else {
      const client = await sessionClient();
      if (form.get("mode") === "signup") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${authOrigin()}/auth/callback` },
        });
        if (error)
          return {
            error:
              "Could not create your account. Please check your details or try signing in.",
          };
        if (!data.session)
          return {
            message: "Check your email to confirm your account, then sign in.",
          };
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error)
          return {
            error: "Could not sign in. Please check your email and password.",
          };
      }
    }
  } catch (e) {
    return {
      error:
        e instanceof Error && e.message === "account_exists"
          ? "This email already has an account. Please sign in."
          : e instanceof Error && e.message === "unauthorized"
            ? "Check your email and password."
            : e instanceof Error && e.message.includes("configured")
              ? e.message
              : "Enter a valid email and a password of at least 8 characters.",
    };
  }
  redirect(next);
}
export async function signOut() {
  if (localMode()) {
    const c = await cookies();
    localStore().signout(c.get("bloomdate_session")?.value);
    c.delete("bloomdate_session");
    redirect("/");
  }
  const client = await sessionClient();
  await client.auth.signOut();
  redirect("/");
}
export async function continueLocally(form: FormData) {
  if (!localMode()) redirect("/auth");
  await rateLimit("local-start", 10);
  if (!localStore().user((await cookies()).get("bloomdate_session")?.value))
    await setLocalSession(localStore().continueOnComputer());
  redirect(form.get("next") === "create" ? "/create" : "/dashboard");
}
