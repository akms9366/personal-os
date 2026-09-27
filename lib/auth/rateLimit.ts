// ログイン試行回数制限。単一プロセス前提のインメモリ実装（新規依存を追加しない、シンプル優先）。
// 公開サーバー（ConoHa VPS 等）に置く際、パスワード1つのみの認証（Issue #5）を
// 総当たり攻撃から守るための最小限の対策。プロセス再起動でリセットされる。

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

interface Bucket {
  failedAttempts: number;
  lockedUntil: number | null;
}

const buckets = new Map<string, Bucket>();

export interface LockoutStatus {
  locked: boolean;
  retryAfterMs?: number;
}

/// 指定キー（IPアドレス等）がロックアウト中か確認する。ロックアウト期限切れなら自動的に解除する。
export function checkLockout(key: string): LockoutStatus {
  const bucket = buckets.get(key);
  if (!bucket || bucket.lockedUntil === null) {
    return { locked: false };
  }

  const now = Date.now();
  if (now < bucket.lockedUntil) {
    return { locked: true, retryAfterMs: bucket.lockedUntil - now };
  }

  buckets.delete(key);
  return { locked: false };
}

/// 失敗を記録する。閾値に達したらロックアウトを設定する。
export function recordFailedAttempt(key: string): void {
  const bucket = buckets.get(key) ?? { failedAttempts: 0, lockedUntil: null };
  bucket.failedAttempts += 1;
  if (bucket.failedAttempts >= MAX_ATTEMPTS) {
    bucket.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  buckets.set(key, bucket);
}

/// 成功したら、そのキーの失敗記録を消す。
export function recordSuccessfulAttempt(key: string): void {
  buckets.delete(key);
}
