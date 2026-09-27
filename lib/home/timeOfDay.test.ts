import { describe, expect, it } from "vitest";
import { getTimeOfDay } from "./timeOfDay";

function atHour(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

describe("getTimeOfDay — Home 三領域の重み付け（Issue #17）", () => {
  it("0時〜11時は morning", () => {
    expect(getTimeOfDay(atHour(0))).toBe("morning");
    expect(getTimeOfDay(atHour(11))).toBe("morning");
  });

  it("12時〜17時は day", () => {
    expect(getTimeOfDay(atHour(12))).toBe("day");
    expect(getTimeOfDay(atHour(17))).toBe("day");
  });

  it("18時以降は night", () => {
    expect(getTimeOfDay(atHour(18))).toBe("night");
    expect(getTimeOfDay(atHour(23))).toBe("night");
  });
});
