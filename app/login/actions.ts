"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, passcodeToken, safeEqual, safeNext } from "@/lib/auth";

export async function login(_: { error: string } | null, form: FormData) {
  const passcode = process.env.APP_PASSCODE;
  const next = String(form.get("next") || "/");
  if (passcode && !safeEqual(String(form.get("passcode") ?? ""), passcode)) return { error: "That's not it — try again." };
  if (passcode) {
    (await cookies()).set(AUTH_COOKIE, await passcodeToken(passcode), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 90, // stay signed in on her phone
      path: "/",
    });
  }
  redirect(safeNext(next));
}

export async function logout() {
  (await cookies()).delete(AUTH_COOKIE);
  redirect("/login");
}
