// UI 部品の共通クラス（デザイントークンは app/globals.css の @theme）。
// 新しい画面もここを使い、色・角丸・余白を画面ごとに作らないこと。

// ---- 入力 ----

export const inputClass =
  "w-full rounded-md border border-dove bg-paper px-3 py-2 text-sm text-ink outline-none transition placeholder:text-pewter focus:border-steel focus:shadow-[0_0_0_3px_rgba(10,10,10,0.06)] disabled:opacity-60";

export const textareaClass = `${inputClass} resize-none leading-relaxed`;

export const labelClass =
  "flex flex-col gap-1.5 text-xs font-medium text-steel";

// ---- ボタン（すべてピル） ----

/// 塗りの黒ピル。その画面・フォームの主アクションにだけ使う。
export const primaryButtonClass =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-slate disabled:opacity-50";

/// 白地＋ヘアライン。キャンセル・補助操作。
export const secondaryButtonClass =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-paper px-3.5 py-1.5 text-sm font-medium text-ink ring-1 ring-dove transition hover:ring-pewter disabled:opacity-50";

/// 枠なし。行内の軽い操作（編集・タスク化など）。ホバーで輪郭が出る。
export const ghostButtonClass =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-steel ring-1 ring-transparent transition hover:text-ink hover:ring-dove disabled:opacity-50";

export const dangerButtonClass =
  "inline-flex shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium text-danger transition hover:bg-danger/[0.06] disabled:opacity-50";

// ---- 面 ----

/// Cream のフラットカード（影・枠なし）。
export const cardClass = "rounded-2xl bg-cream p-5 sm:p-8";

/// 行の集合を1枚の Cream カードにまとめる（行間はヘアライン）。
export const listCardClass = "divide-y divide-dove/60 rounded-2xl bg-cream";

/// listCardClass の1行。
export const listRowClass = "px-4 py-3.5 sm:px-5";

export const emptyClass =
  "rounded-2xl border border-dashed border-dove px-4 py-10 text-center text-sm text-fog";

/// 注意書き（AI 下書きの注記・未設定の案内など）。Sand の淡い面。
export const noticeClass =
  "rounded-2xl bg-sand px-4 py-3 text-sm leading-relaxed text-ink";

export const errorNoticeClass =
  "rounded-2xl bg-danger/[0.06] px-4 py-3 text-sm leading-relaxed text-danger";

// ---- 文字 ----

/// セクション見出し（Display 書体の 24px 相当・細いウェイト・詰めた字間）。
export const sectionTitleClass =
  "text-xl font-normal tracking-[-0.025em] text-ink sm:text-2xl";

/// セクション内の小見出し（等幅・小さめ・グレー）。
export const eyebrowClass = "font-mono text-xs tracking-[-0.01em] text-fog";

/// 日時・件数などのメタ情報。
export const metaClass = "font-mono text-[11px] tracking-[-0.01em] text-pewter";

export const errorTextClass = "text-sm text-danger";

export const successTextClass = "text-sm text-success";

// ---- ピル ----

/// タブ・フィルタのピル。
export function tabPillClass(active: boolean): string {
  return `inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
    active ? "bg-ink text-paper" : "text-fog hover:text-ink"
  }`;
}

/// タグ（Cream 面の上でも埋もれないよう白地＋ヘアライン）。
export const tagClass =
  "inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 text-xs text-steel ring-1 ring-dove transition hover:text-ink";

/// AI 由来であることを示すバッジ（Sand のピル。システム内で唯一の色付きピル）。
export const aiBadgeClass =
  "inline-flex items-center rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-ink";
