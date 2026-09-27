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
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Personal OS
      </h1>
      <LoginForm next={next && next.startsWith("/") ? next : "/home"} />
    </main>
  );
}
