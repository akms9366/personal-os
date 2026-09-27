import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkLockout,
  recordFailedAttempt,
  recordSuccessfulAttempt,
} from "./rateLimit";

describe("rateLimit — ログイン総当たり対策", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("5回失敗するまではロックアウトしない", () => {
    const key = `key-${Math.random()}`;
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(key);
      expect(checkLockout(key).locked).toBe(false);
    }
  });

  it("5回目の失敗でロックアウトする", () => {
    const key = `key-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(key);
    }
    const status = checkLockout(key);
    expect(status.locked).toBe(true);
    expect(status.retryAfterMs).toBeGreaterThan(0);
  });

  it("成功記録でロックアウト前の失敗カウントがリセットされる", () => {
    const key = `key-${Math.random()}`;
    recordFailedAttempt(key);
    recordFailedAttempt(key);
    recordSuccessfulAttempt(key);
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(key);
    }
    expect(checkLockout(key).locked).toBe(false);
  });

  it("ロックアウト期限切れ後は自動的に解除される", () => {
    vi.useFakeTimers();
    const key = `key-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(key);
    }
    expect(checkLockout(key).locked).toBe(true);

    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    expect(checkLockout(key).locked).toBe(false);
    vi.useRealTimers();
  });

  it("キーが異なれば互いに影響しない", () => {
    const keyA = `key-a-${Math.random()}`;
    const keyB = `key-b-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(keyA);
    }
    expect(checkLockout(keyA).locked).toBe(true);
    expect(checkLockout(keyB).locked).toBe(false);
  });
});
