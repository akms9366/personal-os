import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

// ログイン画面。単一ユーザー認証（Issue #5, 14 §3・§8 PR-05）。
// 既に有効なセッションを持つ場合は素通りさせず /home へ戻す（二重ログイン画面を避ける）。
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const cookieStore = await cookies();
  const authenticated = await verifySessionToken(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  );
  if (authenticated) {
    redirect("/home");
  }

  const { next } = await searchParams;

  return (
    <main className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* 装飾: 背後でぼかした暖色のオーブ（機能を持たない雰囲気づけ） */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-[60%] rounded-full bg-[radial-gradient(circle,#ffa888_0%,rgba(255,136,104,0)_70%)] opacity-40 blur-[64px]"
      />

      <div className="relative flex w-full max-w-sm flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-5 text-center">
          <span aria-hidden className="h-6 w-3 rounded-full bg-ink" />
          <h1 className="text-5xl leading-none font-normal tracking-[-0.025em] text-ink">
            Personal OS
          </h1>
          <p className="font-mono text-xs text-fog">
            single-user · private by default
          </p>
        </div>
        <LoginForm next={next && next.startsWith("/") ? next : "/home"} />
      </div>
    </main>
  );
}
