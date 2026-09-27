import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

// 単一ユーザー認証（Issue #5）。/login 以外の全画面を保護する。
// 未認証は /login?next=<元のパス> へリダイレクトし、ログイン後に元の遷移先へ戻す。
// Next.js 16 の命名規約により、ファイル名・エクスポート名は "middleware" ではなく "proxy"
// （旧 middleware.ts は非推奨: https://nextjs.org/docs/messages/middleware-to-proxy）。
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await verifySessionToken(token);

  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // login 画面と、Next.js の内部アセット・public/ 配下の静的ファイル（拡張子付きパス）は保護対象から除く。
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|.*\\.\\w+$).*)"],
};
