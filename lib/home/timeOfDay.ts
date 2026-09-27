// Home の三領域（現在地・今日・振り返り）の重み付け（Issue #17、`11 §4.3` 最小実装）。
// 領域を並び替えたり隠したりはせず、振り返り領域の既定の開閉状態だけを時間帯で変える。

export type TimeOfDay = "morning" | "day" | "night";

export function getTimeOfDay(now: Date = new Date()): TimeOfDay {
  const hour = now.getHours();
  if (hour < 12) {
    return "morning";
  }
  if (hour < 18) {
    return "day";
  }
  return "night";
}
