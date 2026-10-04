import { describe, expect, it } from "vitest";
import {
  formatDateLabel,
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
