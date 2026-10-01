"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  verifyPassword,
} from "@/lib/auth/session";
import {
  checkLockout,
  recordFailedAttempt,
  recordSuccessfulAttempt,
} from "@/lib/auth/rateLimit";

export interface LoginState {
  error?: string;
}

/// リバースプロキシ（Caddy 等）経由を想定し、転送元 IP をキーにする。
/// ヘッダがない場合（ローカル開発等）は固定キーにフォールバックする。
async function getClientKey(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return headerList.get("x-real-ip") ?? "unknown";
}

/// ログイン Server Action。パスワード一致でセッション Cookie を発行し、元の遷移先へ戻す。
/// 公開サーバーでの総当たり攻撃を防ぐため、失敗が続くとロックアウトする（lib/auth/rateLimit.ts）。
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password");
  const next = formData.get("next");
  const clientKey = await getClientKey();

  const lockout = checkLockout(clientKey);
  if (lockout.locked) {
    const minutes = Math.ceil((lockout.retryAfterMs ?? 0) / 60000);
    return { error: `試行回数が多すぎます。${minutes}分後にもう一度お試しください。` };
  }

  if (typeof password !== "string" || !verifyPassword(password)) {
    recordFailedAttempt(clientKey);
    return { error: "パスワードが違います。" };
  }

  recordSuccessfulAttempt(clientKey);

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
