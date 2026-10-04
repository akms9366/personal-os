// 日時の JST 変換ヘルパ。
// VPS（Ubuntu）のシステム TZ は UTC のため、`new Date(y, m, d)` 等のローカル時刻 API を使うと
// 利用者の暦日（日本時間）とずれる。日付入力・表示は必ずここを経由して Asia/Tokyo で扱う。

export const APP_TIME_ZONE = "Asia/Tokyo";
const JST_OFFSET = "+09:00";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isDateString(value: string): boolean {
  if (!DATE_RE.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00${JST_OFFSET}`);
  return !Number.isNaN(date.getTime()) && toJstDateString(date) === value;
}

export function isTimeString(value: string): boolean {
  return TIME_RE.test(value);
}

/// "YYYY-MM-DD" + "HH:MM"（JST）→ Date。不正値は null。
export function parseJstDateTime(date: string, time: string): Date | null {
  if (!isDateString(date) || !isTimeString(time)) {
    return null;
  }
  return new Date(`${date}T${time}:00${JST_OFFSET}`);
}

function jstParts(date: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

/// Date → JST の暦日 "YYYY-MM-DD"。
export function toJstDateString(date: Date): string {
  const p = jstParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

/// Date → JST の時刻 "HH:MM"。
export function toJstTimeString(date: Date): string {
  const p = jstParts(date);
  return `${p.hour}:${p.minute}`;
}

/// 今日（JST）の "YYYY-MM-DD"。
export function todayJst(now: Date = new Date()): string {
  return toJstDateString(now);
}

/// 今月（JST）の "YYYY-MM"。
export function currentMonthJst(now: Date = new Date()): string {
  return todayJst(now).slice(0, 7);
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/// "YYYY-MM-DD" → "10/4(土)"。
export function formatDateLabel(date: string): string {
  if (!isDateString(date)) {
    return date;
  }
  const [, month, day] = date.split("-").map(Number);
  const weekday = new Date(`${date}T12:00:00${JST_OFFSET}`).getUTCDay();
  return `${month}/${day}(${WEEKDAYS[weekday]})`;
}

/// Date → "10/4(土) 18:00"（JST）。
export function formatDateTimeLabel(date: Date): string {
  return `${formatDateLabel(toJstDateString(date))} ${toJstTimeString(date)}`;
}
