// 単一ユーザー認証のセッション/パスワード検証。
// 設計参照: personal-os-design docs/14_Implementation_Backlog.md §3, §8 PR-05
//           （「環境変数パスワードによる単一ユーザー簡易認証」。NextAuth 等の追加依存は導入しない）。
//
// Web Crypto API のみで実装する（Buffer 等の Node 専用 API は使わない）。
// middleware（Edge runtime）と Server Action（Node runtime）の両方から
// 同じロジックで検証できるようにするため。

export const SESSION_COOKIE_NAME = "pos_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30日

function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    // 未設定なら常に検証失敗させる（fail closed）。誤って認証をバイパスしない。
    throw new Error("AUTH_SESSION_SECRET is not set");
  }
  return secret;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

/// 入力パスワードが AUTH_PASSWORD と一致するか（定数時間比較）。
export function verifyPassword(input: string): boolean {
  const expected = process.env.AUTH_PASSWORD;
  if (!expected) {
    // 未設定なら誰も認証できない（fail closed）。
    return false;
  }
  return timingSafeEqual(input, expected);
}

/// 署名付きセッショントークンを新規発行する。形式: base64url(payload).base64url(signature)
export async function createSessionToken(): Promise<string> {
  const payload = JSON.stringify({ iat: Math.floor(Date.now() / 1000) });
  const payloadEncoded = base64UrlEncode(new TextEncoder().encode(payload));
  const signature = await hmacSign(payloadEncoded, getSessionSecret());
  return `${payloadEncoded}.${signature}`;
}

/// セッショントークンを検証する。署名不一致・期限切れ・形式不正はすべて false。
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) {
    return false;
  }
  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }
  const [payloadEncoded, signature] = parts;

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return false;
  }

  const expectedSignature = await hmacSign(payloadEncoded, secret);
  if (!timingSafeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadEncoded))) as {
      iat?: number;
    };
    if (typeof payload.iat !== "number") {
      return false;
    }
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.iat;
    return ageSeconds >= 0 && ageSeconds <= SESSION_MAX_AGE_SECONDS;
  } catch {
    return false;
  }
}
