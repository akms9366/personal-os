// 主ナビゲーションの正本（Navigation Space の定義）。
// 設計参照: personal-os-design docs/05_Information_Architecture.md §9.1（主ナビ順）,
//           §9.4（外部サービス名を主ナビにしない）,
//           docs/99_Reference/Module_Layer_Space_Mapping.md §4。
//
// ここが 5 Space の唯一の定義元。ナビゲーション（components/navigation）と
// 各ページ（app/(app)/*）はこの配列・ヘルパを参照し、順序と語彙を一元管理する。
// 順序は §9.1 の主ナビ優先順位（利用頻度と意思決定の順序）に一致させる。

export type SpaceStatus = "active" | "stub";

export interface Space {
  /// route スラッグ（例: "home" → /home）。
  slug: string;
  /// 主ナビに表示する短いラベル（目的ベース。外部サービス名は使わない）。
  label: string;
  /// ページ見出し。
  title: string;
  /// この空間の主質問・役割（05 §9.1 の一言要約）。
  purpose: string;
  /// MVP の実装状態。active=Home、stub=準備中（Issue #4 の範囲）。
  status: SpaceStatus;
}

/// 5 Space（05 §9.1 の固定順序）。MVP では Home のみ active、他は stub。
export const SPACES: readonly Space[] = [
  {
    slug: "home",
    label: "Home",
    title: "Home",
    purpose: "今日の行動と現在地",
    status: "active",
  },
  {
    slug: "insights",
    label: "Insights",
    title: "Insights",
    purpose: "振り返りと改善判断",
    status: "stub",
  },
  {
    slug: "knowledge",
    label: "Knowledge",
    title: "Knowledge",
    purpose: "記録・探索・再発見",
    status: "stub",
  },
  {
    slug: "finance",
    label: "Finance",
    title: "Finance",
    purpose: "お金の状況と判断材料",
    status: "stub",
  },
  {
    slug: "settings",
    label: "Settings",
    title: "Settings",
    purpose: "主導権、接続、同意、制御",
    status: "stub",
  },
] as const;

/// スラッグから route パスを得る（例: "home" → "/home"）。
export function spaceHref(slug: string): string {
  return `/${slug}`;
}

/// スラッグから Space 定義を得る。未定義スラッグは undefined。
export function getSpace(slug: string): Space | undefined {
  return SPACES.find((space) => space.slug === slug);
}
