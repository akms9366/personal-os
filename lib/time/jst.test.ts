import { describe, expect, it } from "vitest";
import {
  formatDateLabel,
  formatHeadlineDateJst,
  formatRelativeJst,
  isDateString,
  parseJstDateTime,
  toJstDateString,
  toJstTimeString,
  todayJst,
} from "./jst";

describe("jst", () => {
  it("parses a JST date/time independent of the server time zone", () => {
    const date = parseJstDateTime("2026-10-04", "23:59");
    expect(date?.toISOString()).toBe("2026-10-04T14:59:00.000Z");
  });

  it("rejects invalid date or time", () => {
    expect(parseJstDateTime("2026-02-30", "12:00")).toBeNull();
    expect(parseJstDateTime("2026-10-04", "24:00")).toBeNull();
    expect(isDateString("2026-13-01")).toBe(false);
  });

  it("converts to the JST calendar day across the UTC boundary", () => {
    // 2026-10-04 16:00 UTC = 2026-10-05 01:00 JST
    const date = new Date("2026-10-04T16:00:00Z");
    expect(toJstDateString(date)).toBe("2026-10-05");
    expect(toJstTimeString(date)).toBe("01:00");
    expect(todayJst(date)).toBe("2026-10-05");
  });

  it("formats a date label with the weekday", () => {
    expect(formatDateLabel("2026-10-04")).toBe("10/4(日)");
  });
});

describe("formatHeadlineDateJst", () => {
  it("uses the JST calendar day even late in UTC", () => {
    // 2026-10-04T16:00Z = 2026-10-05 01:00 JST（月曜）
    expect(formatHeadlineDateJst(new Date("2026-10-04T16:00:00Z"))).toEqual({
      date: "10月5日",
      weekday: "月曜日",
    });
  });
});

describe("formatRelativeJst", () => {
  const now = new Date("2026-10-05T12:00:00+09:00");
  it("formats recent times relatively", () => {
    expect(formatRelativeJst(new Date("2026-10-05T11:59:40+09:00"), now)).toBe(
      "たった今",
    );
    expect(formatRelativeJst(new Date("2026-10-05T11:55:00+09:00"), now)).toBe(
      "5分",
    );
    expect(formatRelativeJst(new Date("2026-10-05T09:00:00+09:00"), now)).toBe(
      "3時間",
    );
  });
  it("falls back to a date, with the year only for past years", () => {
    expect(formatRelativeJst(new Date("2026-10-03T12:00:00+09:00"), now)).toBe(
      "10月3日",
    );
    expect(formatRelativeJst(new Date("2025-12-31T12:00:00+09:00"), now)).toBe(
      "2025年12月31日",
    );
  });
});
