"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  verifyPassword,
} from "@/lib/auth/session";

export interface LoginState {
  error?: string;
}

/// ログイン Server Action。パスワード一致でセッション Cookie を発行し、元の遷移先へ戻す。
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password");
  const next = formData.get("next");

  if (typeof password !== "string" || !verifyPassword(password)) {
    return { error: "パスワードが違います。" };
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  const destination = typeof next === "string" && next.startsWith("/") ? next : "/home";
  redirect(destination);
}
