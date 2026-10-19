import { toJstDateString, toJstTimeString } from "@/lib/time/jst";

/// "2026-10-19 21:05"（JST）。
export function formatDateTimeJst(date: Date): string {
  return `${toJstDateString(date)} ${toJstTimeString(date)}`;
}
